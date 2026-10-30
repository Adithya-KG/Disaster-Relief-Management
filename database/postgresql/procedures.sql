-- Stored procedure for creating a dispatch
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
    INSERT INTO Dispatch (DispatchID, RequestID, HubID, CampID, VolunteerID, DispatchDate, TransitStatus)
    VALUES (p_dispatch_id, p_request_id, p_hub_id, p_camp_id, p_volunteer_id, CURRENT_TIMESTAMP, 'in_transit');

    INSERT INTO Dispatch_Item (DispatchID, ItemID, QuantityDispatched)
    VALUES (p_dispatch_id, p_item_id, p_quantity);
END;
$$;
