"""
Visual Exploration Lab - Observe-First Computer Vision Mode.

Stateless endpoint for exploring CNN visual processing stages.
No database interaction. No quiz storage.
"""
import base64
import io
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from PIL import Image, ImageFilter, ImageOps, ImageStat

router = APIRouter()


class MCQOption(BaseModel):
    text: str
    is_correct: bool


class ReflectionMCQ(BaseModel):
    question: str
    options: List[MCQOption]
    explanation: str


class StageData(BaseModel):
    stage_name: str
    stage_description: str
    image_base64: str
    mcq: ReflectionMCQ


class FinalInterpretation(BaseModel):
    label: str
    confidence_note: str
    explanation: str


class ExploreResponse(BaseModel):
    stages: List[StageData]
    final_explanation: str
    final_interpretation: Optional[FinalInterpretation] = None


# Hardcoded educational MCQs (stateless, not stored)
STAGE_MCQS = [
    ReflectionMCQ(
        question="What patterns do you notice in the edge-detected image?",
        options=[
            MCQOption(text="Only the colors are visible", is_correct=False),
            MCQOption(text="Boundaries and outlines are highlighted", is_correct=True),
            MCQOption(text="The image is completely black", is_correct=False),
            MCQOption(text="Only the background is visible", is_correct=False),
        ],
        explanation="Early CNN layers act like edge detectors. They respond strongly to boundaries where pixel values change sharply - this is how the network 'sees' shapes!"
    ),
    ReflectionMCQ(
        question="Why does the CNN simplify the image into fewer colors/regions?",
        options=[
            MCQOption(text="To make the image prettier", is_correct=False),
            MCQOption(text="To group similar features together", is_correct=True),
            MCQOption(text="To compress the file size", is_correct=False),
            MCQOption(text="It's a bug in the network", is_correct=False),
        ],
        explanation="Mid-level layers combine low-level features (edges, corners) into patterns. Similar visual elements get grouped - this is how a CNN starts recognizing 'parts' of objects!"
    ),
    ReflectionMCQ(
        question="What does the highly pixelated (grid) view represent?",
        options=[
            MCQOption(text="The original image was low quality", is_correct=False),
            MCQOption(text="Each cell represents a high-level feature activation", is_correct=True),
            MCQOption(text="The image failed to load", is_correct=False),
            MCQOption(text="This is just noise", is_correct=False),
        ],
        explanation="Deep layers produce small feature maps (e.g., 7x7). Each 'cell' is not a pixel but a learned feature detector responding to abstract concepts like 'ear', 'eye', or 'wheel'. The spatial detail is gone, but semantic meaning is strong!"
    ),
]


def image_to_base64(img: Image.Image, format: str = "PNG") -> str:
    """Convert PIL Image to base64 string."""
    buffer = io.BytesIO()
    img.save(buffer, format=format)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def apply_edge_detection(img: Image.Image) -> Image.Image:
    """Simulate early conv layer edge detection."""
    gray = ImageOps.grayscale(img)
    edges = gray.filter(ImageFilter.FIND_EDGES)
    return edges.convert("RGB")


def apply_pattern_grouping(img: Image.Image) -> Image.Image:
    """Simulate mid-layer feature grouping via posterization."""
    # Reduce colors to show grouping
    posterized = ImageOps.posterize(img.convert("RGB"), bits=3)
    # Slight blur to show smooth regions
    blurred = posterized.filter(ImageFilter.GaussianBlur(radius=2))
    return blurred


def apply_deep_features(img: Image.Image) -> Image.Image:
    """Simulate deep layer small feature maps via heavy downsampling."""
    # Resize to 7x7 (typical final conv layer size)
    small = img.resize((7, 7), Image.Resampling.BILINEAR)
    # Scale back up for visualization
    large = small.resize((224, 224), Image.Resampling.NEAREST)
    return large


# Lazy-load classifier to avoid slow imports on every request
_classifier = None
_imagenet_labels = None

def get_classifier():
    """Lazy-load MobileNetV3 classifier and ImageNet labels."""
    global _classifier, _imagenet_labels
    
    if _classifier is None:
        import torch
        from torchvision import models, transforms
        
        # Load lightweight MobileNetV3
        _classifier = {
            "model": models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.IMAGENET1K_V1),
            "transform": transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ]),
            "torch": torch
        }
        _classifier["model"].eval()
        
        # ImageNet labels
        _imagenet_labels = models.MobileNet_V3_Small_Weights.IMAGENET1K_V1.meta["categories"]
    
    return _classifier, _imagenet_labels


def derive_interpretation(img: Image.Image) -> FinalInterpretation:
    """
    Derive semantic interpretation using pretrained MobileNetV3 classifier.
    Returns Top-1 prediction with confidence and layer-based explanation.
    """
    try:
        classifier, labels = get_classifier()
        torch = classifier["torch"]
        
        # Preprocess image
        input_tensor = classifier["transform"](img).unsqueeze(0)
        
        # Run inference
        with torch.no_grad():
            outputs = classifier["model"](input_tensor)
            probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
        
        # Get Top-3 predictions
        top3_prob, top3_idx = torch.topk(probabilities, 3)
        top3_labels = [labels[idx] for idx in top3_idx.tolist()]
        top3_conf = [f"{p*100:.1f}%" for p in top3_prob.tolist()]
        
        # Primary prediction
        primary_label = top3_labels[0]
        primary_conf = top3_prob[0].item()
        
        # Confidence note
        if primary_conf > 0.7:
            confidence_note = "high confidence"
        elif primary_conf > 0.4:
            confidence_note = "moderate confidence"
        else:
            confidence_note = "tentative"
        
        # Generate layer-based explanation
        explanation = (
            f"The model interprets this image as most similar to '{primary_label}'. "
            f"Here's how: Early layers detected edges and boundaries. "
            f"Mid layers grouped these into textures and patterns. "
            f"Deep layers recognized high-level features characteristic of this category. "
            f"The final classifier layer mapped these features to '{primary_label}' ({top3_conf[0]}). "
        )
        
        # Add alternatives if confidence is not overwhelming
        if primary_conf < 0.8 and len(top3_labels) > 1:
            explanation += f"Other possibilities: {top3_labels[1]} ({top3_conf[1]}), {top3_labels[2]} ({top3_conf[2]})."
        
        return FinalInterpretation(
            label=primary_label,
            confidence_note=confidence_note,
            explanation=explanation
        )
        
    except Exception as e:
        # Fallback if classifier fails
        return FinalInterpretation(
            label="unknown",
            confidence_note="classification unavailable",
            explanation=f"Could not classify image: {str(e)}. The visual layer analysis above still demonstrates how CNNs process features hierarchically."
        )


@router.post("/explore", response_model=ExploreResponse)
async def explore_image(file: UploadFile = File(...)):
    """
    Visual Exploration Lab endpoint.
    
    Accepts an image and returns multiple visual processing stages
    with inline educational MCQs.
    
    STATELESS: Nothing is stored in the database.
    """
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Resize for consistent processing
        img = img.resize((224, 224), Image.Resampling.LANCZOS)
        
        # Generate stages
        stages = []
        
        # Stage 1: Original
        stages.append(StageData(
            stage_name="Original Image",
            stage_description="This is what YOU see. But how does a CNN 'see' this image?",
            image_base64=image_to_base64(img),
            mcq=ReflectionMCQ(
                question="Before we begin: What do you think a CNN looks at first?",
                options=[
                    MCQOption(text="The entire object at once", is_correct=False),
                    MCQOption(text="Individual pixels and small patterns", is_correct=True),
                    MCQOption(text="The image label", is_correct=False),
                    MCQOption(text="Random parts of the image", is_correct=False),
                ],
                explanation="CNNs process images hierarchically, starting with tiny local patterns (3x3 or 5x5 pixel regions). They don't see 'cat' immediately - they first detect edges, then textures, then parts, and finally objects!"
            )
        ))
        
        # Stage 2: Edge Detection (Early Layers)
        edges = apply_edge_detection(img)
        stages.append(StageData(
            stage_name="Early Layer View (Edges)",
            stage_description="Early convolutional layers detect edges and boundaries - the simplest features.",
            image_base64=image_to_base64(edges),
            mcq=STAGE_MCQS[0]
        ))
        
        # Stage 3: Pattern Grouping (Mid Layers)
        patterns = apply_pattern_grouping(img)
        stages.append(StageData(
            stage_name="Mid Layer View (Patterns)",
            stage_description="Middle layers combine edges into patterns and group similar regions.",
            image_base64=image_to_base64(patterns),
            mcq=STAGE_MCQS[1]
        ))
        
        # Stage 4: Deep Features (Final Layers)
        deep = apply_deep_features(img)
        stages.append(StageData(
            stage_name="Deep Layer View (Activations)",
            stage_description="Deep layers produce small feature maps encoding high-level concepts.",
            image_base64=image_to_base64(deep),
            mcq=STAGE_MCQS[2]
        ))
        
        # Derive interpretation from image features
        interpretation = derive_interpretation(img)
        
        return ExploreResponse(
            stages=stages,
            final_explanation="""
## What You Just Observed

**Layer 1 (Edges)**: Early convolution kernels act like edge detectors. They fire when they see sharp changes in pixel intensity.

**Layer 2 (Patterns)**: Mid-level layers combine these edges into textures and patterns. Similar visual elements get grouped together.

**Layer 3 (Activations)**: Deep layers produce small, abstract representations. A 7x7 feature map doesn't look like the image anymore, but each cell encodes whether a learned concept (like "fur texture" or "wheel shape") is present.

**The Power of Hierarchy**: This is why CNNs work! By building up from simple features to complex ones, they can recognize objects regardless of position, size, or small variations.
            """,
            final_interpretation=interpretation
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")
