-- ============================================================================
-- Course: 23CSE202 DATABASE MANAGEMENT SYSTEMS
-- Project: Disaster Relief & Resource Distribution Database
-- Engine: PostgreSQL (PL/pgSQL Triggers & Business Rules)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Rule 1: Camp Status Level Auto-Update Trigger Function
-- Evaluates if logged Water < (Population * 2.0 L) OR Food < (Population * 0.5 kg).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_camp_buffer_status()
RETURNS TRIGGER AS $$
DECLARE
    v_population INTEGER;
    v_total_water NUMERIC;
    v_total_food NUMERIC;
    v_new_status VARCHAR(30);
BEGIN
    SELECT CurrentPopulation INTO v_population FROM Relief_Camp WHERE CampID = NEW.CampID;
    
    SELECT COALESCE(SUM(Count), 0) INTO v_total_water 
    FROM Camp_Inventory WHERE CampID = NEW.CampID AND Category = 'Water';
    
    SELECT COALESCE(SUM(Count), 0) INTO v_total_food 
    FROM Camp_Inventory WHERE CampID = NEW.CampID AND Category = 'Food';

    IF v_total_water < (v_population * 2.0) OR v_total_food < (v_population * 0.5) THEN
        v_new_status := 'Critical Level';
    ELSE
        v_new_status := 'Normal';
    END IF;

    UPDATE Relief_Camp
    SET StatusLevel = v_new_status,
        LastUpdated = CURRENT_TIMESTAMP
    WHERE CampID = NEW.CampID;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_camp_inv_insert_check_buffer ON Camp_Inventory;
CREATE TRIGGER trg_camp_inv_insert_check_buffer
AFTER INSERT ON Camp_Inventory
FOR EACH ROW EXECUTE FUNCTION fn_camp_buffer_status();

DROP TRIGGER IF EXISTS trg_camp_inv_update_check_buffer ON Camp_Inventory;
CREATE TRIGGER trg_camp_inv_update_check_buffer
AFTER UPDATE ON Camp_Inventory
FOR EACH ROW EXECUTE FUNCTION fn_camp_buffer_status();

-- ----------------------------------------------------------------------------
-- Rule 2: Prevent Volunteer Double-Booking
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_prevent_volunteer_double_booking()
RETURNS TRIGGER AS $$
DECLARE
    v_active_count INTEGER;
    v_current_avail VARCHAR(30);
BEGIN
    SELECT Availability INTO v_current_avail FROM Volunteer WHERE VolunteerID = NEW.VolunteerID;
    SELECT COUNT(*) INTO v_active_count 
    FROM Dispatch 
    WHERE VolunteerID = NEW.VolunteerID AND TransitStatus IN ('in_transit', 'pending');

    IF v_current_avail != 'available' OR v_active_count > 0 THEN
        RAISE EXCEPTION 'Volunteer already assigned. Select another available volunteer.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_volunteer_double_booking ON Dispatch;
CREATE TRIGGER trg_prevent_volunteer_double_booking
BEFORE INSERT ON Dispatch
FOR EACH ROW EXECUTE FUNCTION fn_prevent_volunteer_double_booking();

-- ----------------------------------------------------------------------------
-- Rule 3: Mark Volunteer Assigned & Request In-Transit on Dispatch
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_dispatch_after_insert()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE Volunteer
    SET Availability = 'assigned'
    WHERE VolunteerID = NEW.VolunteerID;

    UPDATE Request
    SET Status = 'in_transit'
    WHERE RequestID = NEW.RequestID;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dispatch_after_insert ON Dispatch;
CREATE TRIGGER trg_dispatch_after_insert
AFTER INSERT ON Dispatch
FOR EACH ROW EXECUTE FUNCTION fn_dispatch_after_insert();

-- ----------------------------------------------------------------------------
-- Rule 4: Inventory Stock Deduction & Oversell Prevention
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_and_deduct_inventory()
RETURNS TRIGGER AS $$
DECLARE
    v_available INTEGER;
BEGIN
    SELECT QuantityAvailable INTO v_available FROM Inventory WHERE ItemID = NEW.ItemID FOR UPDATE;

    IF v_available < NEW.QuantityDispatched THEN
        RAISE EXCEPTION 'Insufficient inventory available in selected hub stock.';
    END IF;

    UPDATE Inventory
    SET QuantityAvailable = QuantityAvailable - NEW.QuantityDispatched
    WHERE ItemID = NEW.ItemID;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_and_deduct_inventory ON Dispatch_Item;
CREATE TRIGGER trg_check_and_deduct_inventory
BEFORE INSERT ON Dispatch_Item
FOR EACH ROW EXECUTE FUNCTION fn_check_and_deduct_inventory();

-- ----------------------------------------------------------------------------
-- Rule 5: Request Fulfillment Integrity
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_verify_request_fulfillment()
RETURNS TRIGGER AS $$
DECLARE
    v_dispatch_count INTEGER;
BEGIN
    IF NEW.Status = 'fulfilled' THEN
        SELECT COUNT(*) INTO v_dispatch_count FROM Dispatch WHERE RequestID = NEW.RequestID;
        IF v_dispatch_count = 0 THEN
            RAISE EXCEPTION 'Request cannot be marked fulfilled without a matching dispatch.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_request_fulfillment ON Request;
CREATE TRIGGER trg_verify_request_fulfillment
BEFORE UPDATE OF Status ON Request
FOR EACH ROW EXECUTE FUNCTION fn_verify_request_fulfillment();
