"""
Visual Exploration Lab - Observe-First Computer Vision Mode.

Stateless endpoint for exploring CNN visual processing stages.
No database interaction. No quiz storage.
"""
import base64
import io
import numpy as np
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


# ========== IMAGE SIGNAL EXTRACTION ==========

def extract_edge_density(edges_img: Image.Image) -> str:
    """Extract edge density signal from edge-detected image."""
    gray = ImageOps.grayscale(edges_img)
    pixels = np.array(gray)
    edge_pixels = np.sum(pixels > 30)  # Count bright pixels
    total_pixels = pixels.size
    density_ratio = edge_pixels / total_pixels
    
    if density_ratio > 0.3:
        return "high"
    elif density_ratio > 0.15:
        return "medium"
    else:
        return "low"


def extract_texture_strength(pattern_img: Image.Image) -> str:
    """Extract texture strength from pattern grouping."""
    stat = ImageStat.Stat(pattern_img)
    # Check color variance across channels
    variance = sum(stat.var) / len(stat.var)
    
    if variance > 2000:
        return "high"
    elif variance > 800:
        return "medium"
    else:
        return "low"


def extract_shape_coherence(deep_img: Image.Image) -> str:
    """Extract shape coherence from deep features."""
    # Convert to grayscale and check uniformity of the 7x7 grid
    small = deep_img.resize((7, 7), Image.Resampling.NEAREST)
    pixels = np.array(ImageOps.grayscale(small))
    std_dev = np.std(pixels)
    
    if std_dev > 60:
        return "high"
    elif std_dev > 30:
        return "medium"
    else:
        return "low"


# ========== DYNAMIC MCQ GENERATION ==========

def generate_edge_mcq(edge_density: str, img_type: str) -> ReflectionMCQ:
    """Generate edge-specific MCQ based on observed density."""
    if edge_density == "high":
        return ReflectionMCQ(
            question=f"This {img_type} image shows many distinct edges. What does this tell us?",
            options=[
                MCQOption(text="The object has smooth, continuous surfaces", is_correct=False),
                MCQOption(text="The image contains clear boundaries and defined shapes", is_correct=True),
                MCQOption(text="The image is blurry and lacks detail", is_correct=False),
                MCQOption(text="Color is the most important feature", is_correct=False),
            ],
            explanation=f"With {edge_density} edge density, the network detects many sharp boundaries. This indicates well-defined structures - the CNN can clearly identify where one region ends and another begins, which is crucial for object recognition."
        )
    elif edge_density == "medium":
        return ReflectionMCQ(
            question="The edge map shows moderate boundary detection. Why might this be?",
            options=[
                MCQOption(text="The image has both smooth regions and some defined edges", is_correct=True),
                MCQOption(text="The network is malfunctioning", is_correct=False),
                MCQOption(text="All images produce the same edge patterns", is_correct=False),
                MCQOption(text="Edges are irrelevant to CNNs", is_correct=False),
            ],
            explanation=f"{edge_density.capitalize()} edge density suggests a mix: some areas with clear boundaries (like object outlines) and some smoother regions (like gradients or textures). This is common in natural images."
        )
    else:  # low
        return ReflectionMCQ(
            question="Very few edges were detected. What does this reveal about the image?",
            options=[
                MCQOption(text="The image likely contains smooth gradients or uniform regions", is_correct=True),
                MCQOption(text="The edge detector is broken", is_correct=False),
                MCQOption(text="There are more edges than it appears", is_correct=False),
                MCQOption(text="The image is completely black", is_correct=False),
            ],
            explanation=f"Low edge density means fewer sharp transitions between pixel values. The image might show smooth surfaces, sky, water, or blurred content - areas where pixel values change gradually rather than abruptly."
        )


def generate_texture_mcq(texture_strength: str, edge_density: str) -> ReflectionMCQ:
    """Generate texture-specific MCQ based on pattern strength."""
    if texture_strength == "high":
        return ReflectionMCQ(
            question="The pattern layer shows strong, repetitive textures. How does the CNN use this?",
            options=[
                MCQOption(text="Textures are ignored by neural networks", is_correct=False),
                MCQOption(text="The CNN groups similar patterns to identify surface properties", is_correct=True),
                MCQOption(text="Only edges matter, not textures", is_correct=False),
                MCQOption(text="Textures slow down processing", is_correct=False),
            ],
            explanation=f"With {texture_strength} texture strength, the mid-level layers detect repetitive or fine-grained patterns (fur, fabric, bark, etc.). These texture cues help the network distinguish between materials and surfaces beyond just shape."
        )
    elif texture_strength == "medium":
        return ReflectionMCQ(
            question="Why does the CNN show moderate texture grouping for this image?",
            options=[
                MCQOption(text="The image contains some textured areas mixed with solid regions", is_correct=True),
                MCQOption(text="The network randomly simplifies images", is_correct=False),
                MCQOption(text="Texture doesn't vary in real images", is_correct=False),
                MCQOption(text="This always happens regardless of input", is_correct=False),
            ],
            explanation=f"Medium texture strength indicates the image has varied surface properties - perhaps a combination of detailed areas (grass, fabric) and smoother parts (sky, plastic). The CNN adapts its pattern detection to what's actually present."
        )
    else:  # low
        return ReflectionMCQ(
            question="Minimal texture patterns were found. What might this image contain?",
            options=[
                MCQOption(text="Objects with smooth, uniform surfaces or single-color regions", is_correct=True),
                MCQOption(text="Highly detailed, textured surfaces", is_correct=False),
                MCQOption(text="The image failed to process", is_correct=False),
                MCQOption(text="Textures are hidden but present", is_correct=False),
            ],
            explanation=f"Low texture strength means the image likely shows solid objects, clear skies, or smooth manufactured items. With {edge_density} edge density from earlier, structure matters more than surface detail here."
        )


def generate_shape_mcq(shape_coherence: str, confidence_level: str) -> ReflectionMCQ:
    """Generate shape-specific MCQ based on coherence."""
    if shape_coherence == "high":
        return ReflectionMCQ(
            question="The deep layer shows strong, coherent activations. What does this mean?",
            options=[
                MCQOption(text="The image contains spatially inconsistent features", is_correct=False),
                MCQOption(text="High-level features form a recognizable, structured pattern", is_correct=True),
                MCQOption(text="The network is confused", is_correct=False),
                MCQOption(text="Shape doesn't matter at deep layers", is_correct=False),
            ],
            explanation=f"High shape coherence means the deep feature detectors fire consistently across the spatial grid. The network 'sees' organized, object-like structures - leading to {confidence_level} confidence in classification."
        )
    elif shape_coherence == "medium":
        return ReflectionMCQ(
            question="The abstract representation shows moderate structure. Why?",
            options=[
                MCQOption(text="Parts of an object are present, but the overall composition is ambiguous", is_correct=True),
                MCQOption(text="The image is perfectly clear to the network", is_correct=False),
                MCQOption(text="shape coherence doesn't affect recognition", is_correct=False),
                MCQOption(text="This always happens", is_correct=False),
            ],
            explanation=f"Medium shape coherence suggests the network detects some recognizable elements (wheels, eyes, edges) but the overall composition might be cluttered, occluded, or unusual. This partial structure leads to {confidence_level} classification confidence."
        )
    else:  # low
        return ReflectionMCQ(
            question="Very weak shape structure in the deep layers. What's happening?",
            options=[
                MCQOption(text="The image likely contains abstract patterns or multiple overlapping objects", is_correct=True),
                MCQOption(text="The network found a clear, single object", is_correct=False),
                MCQOption(text="Low coherence means perfect recognition", is_correct=False),
                MCQOption(text="Deep layers don't care about shape", is_correct=False),
            ],
            explanation=f"Low shape coherence means the feature activations are scattered or inconsistent. The image might be abstract, heavily textured, or contain scene clutter. This typically results in {confidence_level} classification confidence."
        )


# ========== EXISTING HELPER FUNCTIONS ==========

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
    posterized = ImageOps.posterize(img.convert("RGB"), bits=3)
    blurred = posterized.filter(ImageFilter.GaussianBlur(radius=2))
    return blurred


def apply_deep_features(img: Image.Image) -> Image.Image:
    """Simulate deep layer small feature maps via heavy downsampling."""
    small = img.resize((7, 7), Image.Resampling.BILINEAR)
    large = small.resize((224, 224), Image.Resampling.NEAREST)
    return large


# Lazy-load classifier
_classifier = None
_imagenet_labels = None

def get_classifier():
    """Lazy-load MobileNetV3 classifier and ImageNet labels."""
    global _classifier, _imagenet_labels
    
    if _classifier is None:
        import torch
        from torchvision import models, transforms
        
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
        _imagenet_labels = models.MobileNet_V3_Small_Weights.IMAGENET1K_V1.meta["categories"]
    
    return _classifier, _imagenet_labels


def derive_interpretation(img: Image.Image, edge_density: str, texture_strength: str, shape_coherence: str) -> FinalInterpretation:
    """
    Derive semantic interpretation using pretrained MobileNetV3 classifier.
    Now includes image-specific signals in explanation.
    """
    try:
        classifier, labels = get_classifier()
        torch = classifier["torch"]
        
        input_tensor = classifier["transform"](img).unsqueeze(0)
        
        with torch.no_grad():
            outputs = classifier["model"](input_tensor)
            probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
        
        top3_prob, top3_idx = torch.topk(probabilities, 3)
        top3_labels = [labels[idx] for idx in top3_idx.tolist()]
        top3_conf = [f"{p*100:.1f}%" for p in top3_prob.tolist()]
        
        primary_label = top3_labels[0]
        primary_conf = top3_prob[0].item()
        
        if primary_conf > 0.7:
            confidence_note = "high confidence"
        elif primary_conf > 0.4:
            confidence_note = "moderate confidence"
        else:
            confidence_note = "tentative"
        
        # IMAGE-CONDITIONED EXPLANATION
        explanation = f"The model interprets this image as '{primary_label}' with {confidence_note}. "
        
        # Reference observed signals
        explanation += f"Here's what the network observed: "
        explanation += f"Early layers detected {edge_density} edge density, revealing "
        
        if edge_density == "high":
            explanation += "clear, well-defined boundaries. "
        elif edge_density == "medium":
            explanation += "a mix of defined structures and smooth regions. "
        else:
            explanation += "mostly smooth or gradual transitions. "
        
        explanation += f"Mid-level layers found {texture_strength} texture strength, indicating "
        
        if texture_strength == "high":
            explanation += "rich surface detail and patterns. "
        elif texture_strength == "medium":
            explanation += "moderate surface variation. "
        else:
            explanation += "primarily uniform or solid surfaces. "
        
        explanation += f"Deep layers showed {shape_coherence} shape coherence, meaning "
        
        if shape_coherence == "high":
            explanation += f"the network recognized strongly organized, object-like features consistent with '{primary_label}'. "
        elif shape_coherence == "medium":
            explanation += "some recognizable structure but with ambiguity or complexity. "
        else:
            explanation += "scattered or abstract patterns, making classification challenging. "
        
        explanation += f"Final prediction: {primary_label} ({top3_conf[0]}). "
        
        if primary_conf < 0.8 and len(top3_labels) > 1:
            explanation += f"Alternative possibilities: {top3_labels[1]} ({top3_conf[1]}), {top3_labels[2]} ({top3_conf[2]})."
        
        return FinalInterpretation(
            label=primary_label,
            confidence_note=confidence_note,
            explanation=explanation
        )
        
    except Exception as e:
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
    with IMAGE-CONDITIONED educational MCQs.
    
    STATELESS: Nothing is stored in the database.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        img = img.resize((224, 224), Image.Resampling.LANCZOS)
        
        # Process all stages first to extract signals
        edges = apply_edge_detection(img)
        patterns = apply_pattern_grouping(img)
        deep = apply_deep_features(img)
        
        # EXTRACT IMAGE SIGNALS
        edge_density = extract_edge_density(edges)
        texture_strength = extract_texture_strength(patterns)
        shape_coherence = extract_shape_coherence(deep)
        
        # Determine image type for context
        img_type = "natural" if texture_strength != "low" else "synthetic"
        
        # Get classification confidence for context
        interpretation = derive_interpretation(img, edge_density, texture_strength, shape_coherence)
        confidence_level = interpretation.confidence_note
        
        # GENERATE IMAGE-SPECIFIC STAGES
        stages = []
        
        # Stage 1: Original (keep generic intro)
        stages.append(StageData(
            stage_name="Original Image",
            stage_description=f"This is what YOU see. The CNN will analyze this {img_type} image layer by layer.",
            image_base64=image_to_base64(img),
            mcq=ReflectionMCQ(
                question="Before we begin: What do you think a CNN looks at first?",
                options=[
                    MCQOption(text="The entire object at once", is_correct=False),
                    MCQOption(text="Individual pixels and small patterns", is_correct=True),
                    MCQOption(text="The image label", is_correct=False),
                    MCQOption(text="Random parts of the image", is_correct=False),
                ],
                explanation="CNNs process images hierarchically, starting with tiny local patterns (3x3 or 5x5 pixel regions). They don't see the full picture immediately - they build understanding from simple to complex features."
            )
        ))
        
        # Stage 2: Edge Detection (IMAGE-CONDITIONED)
        edge_desc = f"Early convolutional layers detected {edge_density} edge density in this image."
        stages.append(StageData(
            stage_name="Early Layer View (Edges)",
            stage_description=edge_desc,
            image_base64=image_to_base64(edges),
            mcq=generate_edge_mcq(edge_density, img_type)
        ))
        
        # Stage 3: Pattern Grouping (IMAGE-CONDITIONED)
        texture_desc = f"Middle layers found {texture_strength} texture strength when grouping patterns."
        stages.append(StageData(
            stage_name="Mid Layer View (Patterns)",
            stage_description=texture_desc,
            image_base64=image_to_base64(patterns),
            mcq=generate_texture_mcq(texture_strength, edge_density)
        ))
        
        # Stage 4: Deep Features (IMAGE-CONDITIONED)
        shape_desc = f"Deep layers show {shape_coherence} shape coherence in high-level features."
        stages.append(StageData(
            stage_name="Deep Layer View (Activations)",
            stage_description=shape_desc,
            image_base64=image_to_base64(deep),
            mcq=generate_shape_mcq(shape_coherence, confidence_level)
        ))
        
        # DYNAMIC FINAL EXPLANATION
        final_explanation = f"""
## What You Just Observed (Image-Specific Analysis)

**Your Image Characteristics**:
- Edge Density: {edge_density.upper()}
- Texture Strength: {texture_strength.upper()}
- Shape Coherence: {shape_coherence.upper()}

**Layer 1 (Edges)**: The network detected {edge_density} edge density. """
        
        if edge_density == "high":
            final_explanation += "Many sharp boundaries were found, indicating well-defined structures."
        elif edge_density == "medium":
            final_explanation += "A balanced mix of edges and smooth regions was detected."
        else:
            final_explanation += "Few distinct edges were found, suggesting smooth or gradual transitions."
            
        final_explanation += f"""

**Layer 2 (Patterns)**: Texture analysis revealed {texture_strength} surface detail. """
        
        if texture_strength == "high":
            final_explanation += "Rich, repetitive patterns were grouped together - think fur, fabric, or natural textures."
        elif texture_strength == "medium":
            final_explanation += "Moderate texture variation was found, mixing detailed and smooth areas."
        else:
            final_explanation += "Minimal texture variation suggests uniform surfaces or solid colors."
            
        final_explanation += f"""

**Layer 3 (Activations)**: The abstract representation showed {shape_coherence} shape coherence. """
        
        if shape_coherence == "high":
            final_explanation += "Strong structural organization means the network clearly recognized object-like features."
        elif shape_coherence == "medium":
            final_explanation += "Partial structure suggests recognizable elements but with ambiguity or complexity."
        else:
            final_explanation += "Scattered activations indicate abstract patterns or difficult-to-classify content."
            
        final_explanation += """

**The Power of Hierarchy**: This specific combination of edge, texture, and shape signals led the network to its final interpretation. Different images produce different signals - that's how CNNs adapt to diverse visual content!
        """
        
        return ExploreResponse(
            stages=stages,
            final_explanation=final_explanation,
            final_interpretation=interpretation
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")
