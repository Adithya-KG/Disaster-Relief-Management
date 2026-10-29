-- ============================================================================
-- Course: 23CSE202 DATABASE MANAGEMENT SYSTEMS
-- Project: Disaster Relief & Resource Distribution Database
-- Engine: PostgreSQL (Stored Procedures & Transactions)
-- ============================================================================

-- Stored Procedure for Atomic Dispatch Execution (Section 3.1)
CREATE OR REPLACE PROCEDURE sp_execute_dispatch(
    p_dispatch_id VARCHAR(50),
    p_request_id VARCHAR(50),
    p_hub_id VARCHAR(50),
    p_camp_id VARCHAR(50),
    p_volunteer_id VARCHAR(50),
    p_item_id VARCHAR(50),
    p_quantity INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- 1. Insert into Dispatch (triggers check volunteer availability and set assigned)
    INSERT INTO Dispatch (DispatchID, RequestID, HubID, CampID, VolunteerID, DispatchDate, TransitStatus)
    VALUES (p_dispatch_id, p_request_id, p_hub_id, p_camp_id, p_volunteer_id, CURRENT_TIMESTAMP, 'in_transit');

    -- 2. Insert into Dispatch_Item (triggers verify stock and decrement Inventory)
    INSERT INTO Dispatch_Item (DispatchID, ItemID, QuantityDispatched)
    VALUES (p_dispatch_id, p_item_id, p_quantity);
END;
$$;
