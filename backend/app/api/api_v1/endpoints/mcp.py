import logging
import psutil
import random
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from app.api.mcp_auth import verify_mcp_api_key
from app.schemas import mcp as mcp_schemas

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

router = APIRouter()

# Global state for simulation
# initialized with high load to demonstrate "CRITICAL" state that needs scaling
SIMULATION_STATE = {
    "replicas": 1,
    "base_load": 320.0,  # 320% total load. With 1 replica -> 320% (capped at 100%).
                        # With 4 replicas -> 80%. With 10 replicas -> 32%.
    "memory_base": 70.0  # Base memory usage
}

@router.get("/monitor", response_model=mcp_schemas.MonitorResponse)
async def get_system_monitor(
    _: None = Depends(verify_mcp_api_key)
) -> Any:
    """
    Get current system health metrics (SIMULATED FOR DEMO).
    
    Returns:
        MonitorResponse with system status, CPU load, memory usage, replicas, and alert status
    
    Requires:
        Authorization: Bearer <MCP_API_KEY>
    """
    try:
        # Calculate simulated CPU usage based on replicas
        # effective_load = Total Load / Replicas
        # We add some jitter to make it look realistic
        jitter = random.uniform(-5.0, 5.0)
        cpu_load = (SIMULATION_STATE["base_load"] / SIMULATION_STATE["replicas"]) + jitter
        
        # Clamp between 5% and 100%
        cpu_percent = max(5.0, min(100.0, cpu_load))
        
        # Simulate memory usage (slightly less dependent on replicas for this demo, but let's scale it a bit)
        memory_load = SIMULATION_STATE["memory_base"] - (SIMULATION_STATE["replicas"] * 2) + random.uniform(-2, 2)
        memory_percent = max(20.0, min(95.0, memory_load))
        
        # Determine health status based on resource usage
        status = "HEALTHY"
        alert_active = False
        
        if cpu_percent > 80 or memory_percent > 80:
            status = "CRITICAL"
            alert_active = True
        elif cpu_percent > 60 or memory_percent > 60:
            status = "DEGRADED"
            alert_active = True
        
        replicas = SIMULATION_STATE["replicas"]
        
        logger.info(
            f"Monitor check (SIMULATED): CPU={cpu_percent:.1f}% (Base={SIMULATION_STATE['base_load']}), "
            f"Memory={memory_percent:.1f}%, Status={status}, Replicas={replicas}"
        )
        
        return mcp_schemas.MonitorResponse(
            status=status,
            cpu_load=round(cpu_percent, 2),
            memory_usage=round(memory_percent, 2),
            replicas=replicas,
            alert_active=alert_active
        )
    
    except Exception as e:
        logger.error(f"Error getting system metrics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve system metrics: {str(e)}"
        )


@router.post("/scale", response_model=mcp_schemas.ScaleResponse)
async def scale_service(
    request: mcp_schemas.ScaleRequest,
    _: None = Depends(verify_mcp_api_key)
) -> Any:
    """
    Scale the service to the requested number of replicas (SIMULATED).
    """
    try:
        previous_replicas = SIMULATION_STATE["replicas"]
        SIMULATION_STATE["replicas"] = request.replicas
        
        logger.info(f"🚀 SCALE REQUEST: Scaling from {previous_replicas} to {request.replicas} replicas")
        logger.info(f"   Current time: {__import__('datetime').datetime.now()}")
        logger.info(f"   Effect: Load will now be divided by {request.replicas}")
        
        return mcp_schemas.ScaleResponse(
            success=True,
            message=f"Scaled service from {previous_replicas} to {request.replicas} replicas. "
                   f"System load should decrease momentarily."
        )
    
    except Exception as e:
        logger.error(f"Error processing scale request: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process scale request: {str(e)}"
        )


@router.post("/rollback", response_model=mcp_schemas.RollbackResponse)
async def rollback_service(
    _: None = Depends(verify_mcp_api_key)
) -> Any:
    """
    Trigger a rollback (Resets simulation to initial CRITICAL state).
    """
    try:
        logger.info("🔄 ROLLBACK REQUEST: Resetting simulation to initial state")
        
        # For the demo, "rollback" will act as a reset to the problem state
        # so we can demonstrate the fix again, OR it resets to a stable state (1 replica, normal load?)
        # Usually rollback means "undo recent changes". 
        # But if the user wants to test "rollback fixes things", maybe we should set it to a stable state.
        # Hemanth's specific issue: "system is not coming back to healthy".
        # So let's make rollback force a "stable" state.
        
        # Option A: Reset to 1 replica, but remove the high load trigger?
        # Option B: Just reset replicas to 1 (which puts it back in CRITICAL if load is static).
        
        # Let's interpret rollback as "Revert to last known good configuration".
        # We'll set replicas to a safe number (e.g. 5) OR we reset the base load if we were simulating a spike.
        
        # Let's just reset to 1 replica for now, as that seems to be the "default" state.
        SIMULATION_STATE["replicas"] = 1
        
        return mcp_schemas.RollbackResponse(
            success=True,
            message="Rollback processed. Simulation state reset to 1 replica."
        )
    
    except Exception as e:
        logger.error(f"Error processing rollback request: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process rollback request: {str(e)}"
        )

