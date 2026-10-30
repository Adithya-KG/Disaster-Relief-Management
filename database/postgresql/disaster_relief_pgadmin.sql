-- Drops
DROP PROCEDURE IF EXISTS sp_execute_dispatch(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INT);

DROP TRIGGER IF EXISTS trg_camp_inv_insert_check_buffer ON Camp_Inventory;
DROP TRIGGER IF EXISTS trg_camp_inv_update_check_buffer ON Camp_Inventory;
DROP TRIGGER IF EXISTS trg_prevent_volunteer_double_booking ON Dispatch;
DROP TRIGGER IF EXISTS trg_dispatch_after_insert ON Dispatch;
DROP TRIGGER IF EXISTS trg_check_and_deduct_inventory ON Dispatch_Item;
DROP TRIGGER IF EXISTS trg_verify_request_fulfillment ON Request;

DROP FUNCTION IF EXISTS fn_camp_buffer_status();
DROP FUNCTION IF EXISTS fn_prevent_volunteer_double_booking();
DROP FUNCTION IF EXISTS fn_dispatch_after_insert();
DROP FUNCTION IF EXISTS fn_check_and_deduct_inventory();
DROP FUNCTION IF EXISTS fn_verify_request_fulfillment();

DROP TABLE IF EXISTS App_User CASCADE;
DROP TABLE IF EXISTS Dispatch_Item CASCADE;
DROP TABLE IF EXISTS Dispatch CASCADE;
DROP TABLE IF EXISTS Request CASCADE;
DROP TABLE IF EXISTS Camp_Inventory CASCADE;
DROP TABLE IF EXISTS Inventory CASCADE;
DROP TABLE IF EXISTS Volunteer CASCADE;
DROP TABLE IF EXISTS Supply_Hub CASCADE;
DROP TABLE IF EXISTS Relief_Camp CASCADE;

-- Tables

-- Relief Camps
CREATE TABLE Relief_Camp (
    CampID VARCHAR(50) PRIMARY KEY,
    CampName VARCHAR(100) NOT NULL,
    Location VARCHAR(200) NOT NULL,
    Latitude NUMERIC(9, 6) NOT NULL,
    Longitude NUMERIC(9, 6) NOT NULL,
    CurrentPopulation INTEGER NOT NULL CHECK (CurrentPopulation >= 0),
    Capacity INTEGER NOT NULL DEFAULT 1000 CHECK (Capacity >= CurrentPopulation),
    ContactName VARCHAR(100),
    ContactPhone VARCHAR(30) NOT NULL,
    ContactInfo VARCHAR(200),
    Zone VARCHAR(50) DEFAULT 'General',
    StatusLevel VARCHAR(30) NOT NULL DEFAULT 'Normal' CHECK (StatusLevel IN ('Normal', 'Moderate', 'Critical Level')),
    LastUpdated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Supply Hubs
CREATE TABLE Supply_Hub (
    HubID VARCHAR(50) PRIMARY KEY,
    HubName VARCHAR(100) NOT NULL,
    Location VARCHAR(200) NOT NULL,
    Latitude NUMERIC(9, 6) NOT NULL,
    Longitude NUMERIC(9, 6) NOT NULL,
    Zone VARCHAR(50) NOT NULL,
    Capacity INTEGER NOT NULL CHECK (Capacity > 0),
    ContactInfo VARCHAR(200)
);

-- Hub Inventory
CREATE TABLE Inventory (
    ItemID VARCHAR(50) PRIMARY KEY,
    HubID VARCHAR(50) NOT NULL,
    ItemName VARCHAR(100) NOT NULL,
    Category VARCHAR(50) NOT NULL CHECK (Category IN ('Water', 'Food', 'Medical', 'Shelter', 'Other')),
    ShelfLifeCategory VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (ShelfLifeCategory IN ('Short', 'Medium', 'Long')),
    QuantityAvailable INTEGER NOT NULL CHECK (QuantityAvailable >= 0),
    Threshold INTEGER NOT NULL DEFAULT 1000,
    CriticalThreshold INTEGER NOT NULL DEFAULT 500,
    Unit VARCHAR(30) NOT NULL,
    ShelfLifeDate DATE NOT NULL,
    CONSTRAINT fk_inv_hub FOREIGN KEY (HubID) REFERENCES Supply_Hub(HubID) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- Volunteers
CREATE TABLE Volunteer (
    VolunteerID VARCHAR(50) PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(30) NOT NULL,
    Skills TEXT NOT NULL,
    VehicleAccess VARCHAR(50) NOT NULL CHECK (VehicleAccess IN ('Truck', 'Van', 'Motorbike', 'None')),
    AssignedZone VARCHAR(50) NOT NULL,
    Availability VARCHAR(30) NOT NULL DEFAULT 'available' CHECK (Availability IN ('available', 'assigned', 'standby'))
);

-- Camp Requests
CREATE TABLE Request (
    RequestID VARCHAR(50) PRIMARY KEY,
    CampID VARCHAR(50) NOT NULL,
    ItemCategory VARCHAR(50) NOT NULL CHECK (ItemCategory IN ('Water', 'Food', 'Medical', 'Shelter', 'Other')),
    ItemName VARCHAR(100) NOT NULL,
    QuantityRequested INTEGER NOT NULL CHECK (QuantityRequested > 0),
    Unit VARCHAR(30) NOT NULL,
    UrgencyLevel VARCHAR(30) NOT NULL DEFAULT 'medium' CHECK (UrgencyLevel IN ('critical', 'high', 'medium', 'low')),
    RequestDate TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    Status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (Status IN ('pending', 'in_transit', 'fulfilled', 'cancelled')),
    CONSTRAINT fk_req_camp FOREIGN KEY (CampID) REFERENCES Relief_Camp(CampID) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- Dispatches
CREATE TABLE Dispatch (
    DispatchID VARCHAR(50) PRIMARY KEY,
    RequestID VARCHAR(50) NOT NULL UNIQUE,
    HubID VARCHAR(50) NOT NULL,
    CampID VARCHAR(50) NOT NULL,
    VolunteerID VARCHAR(50) NOT NULL,
    DispatchDate TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    TransitStatus VARCHAR(30) NOT NULL DEFAULT 'in_transit' CHECK (TransitStatus IN ('pending', 'in_transit', 'delivered', 'cancelled')),
    CONSTRAINT fk_dsp_req FOREIGN KEY (RequestID) REFERENCES Request(RequestID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_dsp_hub FOREIGN KEY (HubID) REFERENCES Supply_Hub(HubID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_dsp_camp FOREIGN KEY (CampID) REFERENCES Relief_Camp(CampID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_dsp_vol FOREIGN KEY (VolunteerID) REFERENCES Volunteer(VolunteerID) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- Dispatch Items
CREATE TABLE Dispatch_Item (
    DispatchID VARCHAR(50) NOT NULL,
    ItemID VARCHAR(50) NOT NULL,
    QuantityDispatched INTEGER NOT NULL CHECK (QuantityDispatched > 0),
    PRIMARY KEY (DispatchID, ItemID),
    CONSTRAINT fk_di_dsp FOREIGN KEY (DispatchID) REFERENCES Dispatch(DispatchID) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_di_item FOREIGN KEY (ItemID) REFERENCES Inventory(ItemID) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- Camp Inventory
CREATE TABLE Camp_Inventory (
    InventoryID VARCHAR(50) PRIMARY KEY,
    CampID VARCHAR(50) NOT NULL,
    ItemName VARCHAR(100) NOT NULL,
    Category VARCHAR(50) NOT NULL CHECK (Category IN ('Water', 'Food', 'Medical', 'Shelter', 'Other')),
    Count INTEGER NOT NULL CHECK (Count >= 0),
    Unit VARCHAR(30) NOT NULL,
    LastLogged TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ci_camp FOREIGN KEY (CampID) REFERENCES Relief_Camp(CampID) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT uq_camp_item UNIQUE (CampID, ItemName)
);

-- App Users
CREATE TABLE App_User (
    UserID VARCHAR(50) PRIMARY KEY,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Password VARCHAR(100) NOT NULL,
    FullName VARCHAR(100) NOT NULL,
    Role VARCHAR(30) NOT NULL CHECK (Role IN ('dispatcher', 'camp_manager')),
    AssignedCampID VARCHAR(50),
    CreatedAt TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_camp FOREIGN KEY (AssignedCampID) REFERENCES Relief_Camp(CampID) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Triggers

-- Camp status update trigger
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

-- Volunteer double-booking prevention trigger
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

-- Volunteer assignment and request status update trigger
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

-- Stock deduction and check trigger
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

-- Request fulfillment verification trigger
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

-- Seed Data

-- Relief Camps
INSERT INTO Relief_Camp (CampID, CampName, Location, Latitude, Longitude, CurrentPopulation, Capacity, ContactName, ContactPhone, ContactInfo, Zone, StatusLevel, LastUpdated)
VALUES
('camp-east-ridge', 'East Ridge Camp', 'East Ridge High School, Ward 8', 9.9816, 76.2999, 1240, 1400, 'Maya Iyer', '+91 98765 01010', 'Maya Iyer (+91 98765 01010)', 'East', 'Critical Level', '2026-08-05 08:10:00+05:30'),
('camp-riverbend', 'Riverbend Shelter', 'Riverbend Community Hall', 9.9312, 76.2673, 680, 900, 'Omar Khan', '+91 98765 01011', 'Omar Khan (+91 98765 01011)', 'South', 'Normal', '2026-08-05 08:18:00+05:30'),
('camp-hillview', 'Hillview Transit Camp', 'Hillview Stadium Gate 2', 10.0150, 76.3240, 970, 1000, 'Leela Menon', '+91 98765 01012', 'Leela Menon (+91 98765 01012)', 'North', 'Critical Level', '2026-08-05 08:22:00+05:30');

-- Supply Hubs
INSERT INTO Supply_Hub (HubID, HubName, Location, Latitude, Longitude, Zone, Capacity, ContactInfo)
VALUES
('hub-north', 'North Supply Hub', 'North Container Terminal, Aluva Road', 10.0280, 76.3080, 'North', 50000, 'Logistics Officer A (+91 98765 02001)'),
('hub-east', 'East Logistics Yard', 'Kakkanad Bypass Yard 4', 9.9980, 76.3550, 'East', 75000, 'Logistics Officer B (+91 98765 02002)'),
('hub-south', 'South Medical Depot', 'Vyttila Mobility Depot', 9.9670, 76.3180, 'South', 60000, 'Medical Logistics Officer (+91 98765 02003)');

-- Hub Inventory
INSERT INTO Inventory (ItemID, HubID, ItemName, Category, ShelfLifeCategory, QuantityAvailable, Threshold, CriticalThreshold, Unit, ShelfLifeDate)
VALUES
('inv-001', 'hub-east', 'Potable Water', 'Water', 'Short', 9200, 5000, 2500, 'liters', '2026-08-28'),
('inv-002', 'hub-east', 'Rice Rations', 'Food', 'Medium', 1800, 2000, 900, 'kg', '2026-11-20'),
('inv-003', 'hub-north', 'ORS Sachets', 'Medical', 'Short', 620, 900, 400, 'packs', '2026-09-15'),
('inv-004', 'hub-south', 'Blankets', 'Shelter', 'Long', 4300, 1500, 700, 'units', '2030-01-01'),
('inv-005', 'hub-north', 'Infant Formula', 'Food', 'Short', 320, 500, 250, 'tins', '2026-10-03'),
('inv-006', 'hub-north', 'Potable Water', 'Water', 'Short', 6500, 4000, 2000, 'liters', '2026-09-02'),
('inv-007', 'hub-south', 'First Aid Kits', 'Medical', 'Medium', 850, 500, 200, 'units', '2027-05-15');

-- Volunteers
INSERT INTO Volunteer (VolunteerID, Name, Phone, Skills, VehicleAccess, AssignedZone, Availability)
VALUES
('vol-101', 'Anita Rao', '+91 98765 03001', 'Heavy vehicle, Radio', 'Truck', 'East', 'available'),
('vol-102', 'Kiran Das', '+91 98765 03002', 'Paramedic, Navigation', 'Van', 'North', 'available'),
('vol-103', 'Farah Ali', '+91 98765 03003', 'Forklift, Inventory', 'Truck', 'South', 'available'),
('vol-104', 'Rohan Sen', '+91 98765 03004', 'First aid, Translation', 'None', 'East', 'standby');

-- Requests
INSERT INTO Request (RequestID, CampID, ItemCategory, ItemName, QuantityRequested, Unit, UrgencyLevel, RequestDate, Status)
VALUES
('REQ-1039', 'camp-riverbend', 'Medical', 'First Aid Kits', 150, 'units', 'high', '2026-08-05 07:15:00+05:30', 'pending'),
('REQ-1048', 'camp-east-ridge', 'Water', 'Potable Water', 3000, 'liters', 'critical', '2026-08-05 08:08:00+05:30', 'pending'),
('REQ-1049', 'camp-hillview', 'Medical', 'ORS Sachets', 500, 'packs', 'high', '2026-08-05 08:16:00+05:30', 'pending'),
('REQ-1050', 'camp-riverbend', 'Shelter', 'Blankets', 300, 'units', 'medium', '2026-08-05 08:24:00+05:30', 'pending');

-- Existing dispatch for REQ-1039
CALL sp_execute_dispatch('DSP-1039', 'REQ-1039', 'hub-south', 'camp-riverbend', 'vol-103', 'inv-007', 150);

-- Camp Inventory
INSERT INTO Camp_Inventory (InventoryID, CampID, ItemName, Category, Count, Unit, LastLogged)
VALUES
('camp-inv-001', 'camp-east-ridge', 'Potable Water', 'Water', 900, 'liters', '2026-08-05 07:50:00+05:30'),
('camp-inv-002', 'camp-east-ridge', 'Rice Rations', 'Food', 700, 'kg', '2026-08-05 07:46:00+05:30'),
('camp-inv-003', 'camp-riverbend', 'Blankets', 'Shelter', 480, 'units', '2026-08-05 07:35:00+05:30'),
('camp-inv-004', 'camp-riverbend', 'Potable Water', 'Water', 2500, 'liters', '2026-08-05 07:40:00+05:30'),
('camp-inv-005', 'camp-riverbend', 'Rice Rations', 'Food', 600, 'kg', '2026-08-05 07:42:00+05:30'),
('camp-inv-006', 'camp-hillview', 'Potable Water', 'Water', 500, 'liters', '2026-08-05 07:55:00+05:30');

-- Users
INSERT INTO App_User (UserID, Email, Password, FullName, Role, AssignedCampID)
VALUES
('usr-001', 'dispatcher@reliefops.org', 'admin123', 'Regional Dispatcher', 'dispatcher', NULL),
('usr-002', 'maya@eastridge.org', 'camp123', 'Maya Iyer', 'camp_manager', 'camp-east-ridge'),
('usr-003', 'omar@riverbend.org', 'camp123', 'Omar Khan', 'camp_manager', 'camp-riverbend'),
('usr-004', 'leela@hillview.org', 'camp123', 'Leela Menon', 'camp_manager', 'camp-hillview'),
('usr-005', 'admin@reliefops.org', 'admin123', 'System Administrator', 'dispatcher', NULL);

-- Verification queries

-- 1. Nearest stocked hub for pending requests
SELECT 
    r.RequestID,
    r.ItemCategory,
    r.ItemName,
    r.QuantityRequested,
    r.Unit,
    r.UrgencyLevel,
    c.CampName,
    c.Location AS CampLocation,
    sh.HubID,
    sh.HubName,
    inv.QuantityAvailable AS StockAtHub,
    ROUND(
        (111.0 * SQRT(
            POWER(sh.Latitude - c.Latitude, 2) +
            POWER((sh.Longitude - c.Longitude) * COS(RADIANS(c.Latitude)), 2)
        ))::numeric, 1
    ) AS DistanceKm,
    ROUND(
        ((111.0 * SQRT(
            POWER(sh.Latitude - c.Latitude, 2) +
            POWER((sh.Longitude - c.Longitude) * COS(RADIANS(c.Latitude)), 2)
        ) / 25.0) * 60 + 15)::numeric
    ) AS EstimatedTransitMinutes
FROM Request r
JOIN Relief_Camp c ON r.CampID = c.CampID
JOIN Inventory inv ON inv.ItemName = r.ItemName AND inv.QuantityAvailable >= r.QuantityRequested
JOIN Supply_Hub sh ON inv.HubID = sh.HubID
WHERE r.Status = 'pending'
ORDER BY 
    CASE r.UrgencyLevel 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
    END,
    DistanceKm ASC;

-- 2. Volunteer roster
SELECT 
    v.VolunteerID,
    v.Name AS VolunteerName,
    v.Phone,
    v.VehicleAccess,
    v.AssignedZone,
    v.Availability,
    d.DispatchID,
    d.RequestID,
    c.CampName AS DestinationCamp,
    d.DispatchDate
FROM Volunteer v
LEFT JOIN Dispatch d ON v.VolunteerID = d.VolunteerID AND d.TransitStatus IN ('in_transit', 'pending')
LEFT JOIN Relief_Camp c ON d.CampID = c.CampID
ORDER BY v.Availability, v.Name;
