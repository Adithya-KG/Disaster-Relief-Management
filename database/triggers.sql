-- ============================================================================
-- Course: 23CSE202 DATABASE MANAGEMENT SYSTEMS
-- Project: Disaster Relief & Resource Distribution Database
-- Triggers and Integrity Rules (Section 3.1 Business Rules)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Rule 1: Camp Status Level Auto-Update Trigger
-- A camp's StatusLevel flips to 'Critical Level' automatically if logged water
-- drops below 2 Liters/person/day OR logged food drops below 0.5 kg/person/day.
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_camp_inv_insert_check_buffer;
DROP TRIGGER IF EXISTS trg_camp_inv_update_check_buffer;

CREATE TRIGGER trg_camp_inv_insert_check_buffer
AFTER INSERT ON Camp_Inventory
BEGIN
    UPDATE Relief_Camp
    SET StatusLevel = CASE
        -- If water stock is below 2L per person OR food stock is below 0.5kg per person
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

-- ----------------------------------------------------------------------------
-- Rule 2: Prevent Volunteer Double-Booking
-- A volunteer can only have one active dispatch at a time (TransitStatus IN ('in_transit', 'pending')).
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- Rule 3: Automatically Mark Volunteer as Assigned on Dispatch
-- And mark the associated Request as 'in_transit'
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- Rule 4: Prevent Overselling Inventory
-- Stock cannot be dispatched if QuantityDispatched exceeds QuantityAvailable.
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- Rule 5: Request Fulfillment Integrity
-- A request cannot be marked 'fulfilled' unless a matching dispatch record exists.
-- ----------------------------------------------------------------------------

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
