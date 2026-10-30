-- Auto-update camp status when camp inventory changes
DROP TRIGGER IF EXISTS trg_camp_inv_insert_check_buffer;
DROP TRIGGER IF EXISTS trg_camp_inv_update_check_buffer;

CREATE TRIGGER trg_camp_inv_insert_check_buffer
AFTER INSERT ON Camp_Inventory
BEGIN
    UPDATE Relief_Camp
    SET StatusLevel = CASE
        WHEN (
            SELECT COALESCE(SUM(Count), 0)
            FROM Camp_Inventory
            WHERE CampID = NEW.CampID AND Category = 'Water'
        ) < (Relief_Camp.CurrentPopulation * 2.0)
        OR (
            SELECT COALESCE(SUM(Count), 0)
            FROM Camp_Inventory
            WHERE CampID = NEW.CampID AND Category = 'Food'
        ) < (Relief_Camp.CurrentPopulation * 0.5)
        THEN 'Critical Level'
        ELSE 'Normal'
    END,
    LastUpdated = CURRENT_TIMESTAMP
    WHERE CampID = NEW.CampID;
END;

CREATE TRIGGER trg_camp_inv_update_check_buffer
AFTER UPDATE ON Camp_Inventory
BEGIN
    UPDATE Relief_Camp
    SET StatusLevel = CASE
        WHEN (
            SELECT COALESCE(SUM(Count), 0)
            FROM Camp_Inventory
            WHERE CampID = NEW.CampID AND Category = 'Water'
        ) < (Relief_Camp.CurrentPopulation * 2.0)
        OR (
            SELECT COALESCE(SUM(Count), 0)
            FROM Camp_Inventory
            WHERE CampID = NEW.CampID AND Category = 'Food'
        ) < (Relief_Camp.CurrentPopulation * 0.5)
        THEN 'Critical Level'
        ELSE 'Normal'
    END,
    LastUpdated = CURRENT_TIMESTAMP
    WHERE CampID = NEW.CampID;
END;

-- Prevent volunteer double booking
DROP TRIGGER IF EXISTS trg_prevent_volunteer_double_booking;

CREATE TRIGGER trg_prevent_volunteer_double_booking
BEFORE INSERT ON Dispatch
BEGIN
    SELECT
        CASE
            WHEN (
                SELECT COUNT(*)
                FROM Dispatch
                WHERE VolunteerID = NEW.VolunteerID
                  AND TransitStatus IN ('in_transit', 'pending')
            ) > 0
            OR (
                SELECT Availability
                FROM Volunteer
                WHERE VolunteerID = NEW.VolunteerID
            ) = 'assigned'
            THEN RAISE(ABORT, 'Volunteer already assigned. Select another available volunteer.')
        END;
END;

-- Update volunteer and request status when dispatch is created
DROP TRIGGER IF EXISTS trg_dispatch_after_insert;

CREATE TRIGGER trg_dispatch_after_insert
AFTER INSERT ON Dispatch
BEGIN
    UPDATE Volunteer
    SET Availability = 'assigned'
    WHERE VolunteerID = NEW.VolunteerID;

    UPDATE Request
    SET Status = 'in_transit'
    WHERE RequestID = NEW.RequestID;
END;

-- Stock check and deduction on dispatch
DROP TRIGGER IF EXISTS trg_check_inventory_stock;
DROP TRIGGER IF EXISTS trg_deduct_inventory_stock;

CREATE TRIGGER trg_check_inventory_stock
BEFORE INSERT ON Dispatch_Item
BEGIN
    SELECT
        CASE
            WHEN (
                SELECT QuantityAvailable
                FROM Inventory
                WHERE ItemID = NEW.ItemID
            ) < NEW.QuantityDispatched
            THEN RAISE(ABORT, 'Insufficient inventory available in selected hub stock.')
        END;
END;

CREATE TRIGGER trg_deduct_inventory_stock
AFTER INSERT ON Dispatch_Item
BEGIN
    UPDATE Inventory
    SET QuantityAvailable = QuantityAvailable - NEW.QuantityDispatched
    WHERE ItemID = NEW.ItemID;
END;

-- Verify request has a dispatch before marking fulfilled
DROP TRIGGER IF EXISTS trg_verify_request_fulfillment;

CREATE TRIGGER trg_verify_request_fulfillment
BEFORE UPDATE OF Status ON Request
FOR EACH ROW
WHEN NEW.Status = 'fulfilled'
BEGIN
    SELECT
        CASE
            WHEN (
                SELECT COUNT(*)
                FROM Dispatch
                WHERE RequestID = NEW.RequestID
            ) = 0
            THEN RAISE(ABORT, 'Request cannot be marked fulfilled without a matching dispatch.')
        END;
END;
