from pydantic import BaseModel, Field
from typing import Literal


class MonitorResponse(BaseModel):
    """Response model for GET /api/v1/monitor endpoint"""
    status: Literal["HEALTHY", "DEGRADED", "CRITICAL"] = Field(
        ..., 
        description="Overall system health status"
    )
    cpu_load: float = Field(
        ..., 
        description="CPU load percentage (0-100)",
        ge=0,
        le=100
    )
    memory_usage: float = Field(
        ..., 
        description="Memory usage percentage (0-100)",
        ge=0,
        le=100
    )
    replicas: int = Field(
        ..., 
        description="Number of service replicas running",
        ge=0
    )
    alert_active: bool = Field(
        ..., 
        description="Whether any alerts are currently active"
    )


class ScaleRequest(BaseModel):
    """Request model for POST /api/v1/scale endpoint"""
    replicas: int = Field(
        ..., 
        description="Desired number of service replicas",
        ge=1,
        le=10
    )


class ScaleResponse(BaseModel):
    """Response model for POST /api/v1/scale endpoint"""
    success: bool = Field(..., description="Whether the scaling request was successful")
    message: str = Field(..., description="Status message")


class RollbackResponse(BaseModel):
    """Response model for POST /api/v1/rollback endpoint"""
    success: bool = Field(..., description="Whether the rollback was successful")
    message: str = Field(..., description="Status message")
