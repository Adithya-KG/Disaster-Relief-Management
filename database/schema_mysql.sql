CREATE DATABASE IF NOT EXISTS DisasterReliefDB;
USE DisasterReliefDB;

-- Drop existing tables
DROP TABLE IF EXISTS Dispatch_Item;
DROP TABLE IF EXISTS Dispatch;
DROP TABLE IF EXISTS Request;
DROP TABLE IF EXISTS Camp_Inventory;
DROP TABLE IF EXISTS Inventory;
DROP TABLE IF EXISTS Volunteer;
DROP TABLE IF EXISTS Supply_Hub;
DROP TABLE IF EXISTS Relief_Camp;

-- Relief Camps
CREATE TABLE Relief_Camp (
    CampID VARCHAR(50) PRIMARY KEY,
    CampName VARCHAR(100) NOT NULL,
    Location VARCHAR(200) NOT NULL,
    Latitude DECIMAL(9, 6) NOT NULL,
    Longitude DECIMAL(9, 6) NOT NULL,
    CurrentPopulation INT NOT NULL CHECK (CurrentPopulation >= 0),
    Capacity INT NOT NULL DEFAULT 1000 CHECK (Capacity >= CurrentPopulation),
    ContactName VARCHAR(100),
    ContactPhone VARCHAR(30) NOT NULL,
    ContactInfo VARCHAR(200),
    Zone VARCHAR(50) DEFAULT 'General',
    StatusLevel ENUM('Normal', 'Moderate', 'Critical Level') NOT NULL DEFAULT 'Normal',
    LastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Supply Hubs
CREATE TABLE Supply_Hub (
    HubID VARCHAR(50) PRIMARY KEY,
    HubName VARCHAR(100) NOT NULL,
    Location VARCHAR(200) NOT NULL,
    Latitude DECIMAL(9, 6) NOT NULL,
    Longitude DECIMAL(9, 6) NOT NULL,
    Zone VARCHAR(50) NOT NULL,
    Capacity INT NOT NULL CHECK (Capacity > 0),
    ContactInfo VARCHAR(200)
) ENGINE=InnoDB;

-- Hub Inventory
CREATE TABLE Inventory (
    ItemID VARCHAR(50) PRIMARY KEY,
    HubID VARCHAR(50) NOT NULL,
    ItemName VARCHAR(100) NOT NULL,
    Category ENUM('Water', 'Food', 'Medical', 'Shelter', 'Other') NOT NULL,
    ShelfLifeCategory ENUM('Short', 'Medium', 'Long') NOT NULL DEFAULT 'Medium',
    QuantityAvailable INT NOT NULL CHECK (QuantityAvailable >= 0),
    Threshold INT NOT NULL DEFAULT 1000,
    CriticalThreshold INT NOT NULL DEFAULT 500,
    Unit VARCHAR(30) NOT NULL,
    ShelfLifeDate DATE NOT NULL,
    CONSTRAINT fk_inv_hub FOREIGN KEY (HubID) REFERENCES Supply_Hub(HubID) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Volunteers
CREATE TABLE Volunteer (
    VolunteerID VARCHAR(50) PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(30) NOT NULL,
    Skills TEXT NOT NULL,
    VehicleAccess ENUM('Truck', 'Van', 'Motorbike', 'None') NOT NULL,
    AssignedZone VARCHAR(50) NOT NULL,
    Availability ENUM('available', 'assigned', 'standby') NOT NULL DEFAULT 'available'
) ENGINE=InnoDB;

-- Camp Requests
CREATE TABLE Request (
    RequestID VARCHAR(50) PRIMARY KEY,
    CampID VARCHAR(50) NOT NULL,
    ItemCategory ENUM('Water', 'Food', 'Medical', 'Shelter', 'Other') NOT NULL,
    ItemName VARCHAR(100) NOT NULL,
    QuantityRequested INT NOT NULL CHECK (QuantityRequested > 0),
    Unit VARCHAR(30) NOT NULL,
    UrgencyLevel ENUM('critical', 'high', 'medium', 'low') NOT NULL DEFAULT 'medium',
    RequestDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Status ENUM('pending', 'in_transit', 'fulfilled', 'cancelled') NOT NULL DEFAULT 'pending',
    CONSTRAINT fk_req_camp FOREIGN KEY (CampID) REFERENCES Relief_Camp(CampID) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Dispatches
CREATE TABLE Dispatch (
    DispatchID VARCHAR(50) PRIMARY KEY,
    RequestID VARCHAR(50) NOT NULL UNIQUE,
    HubID VARCHAR(50) NOT NULL,
    CampID VARCHAR(50) NOT NULL,
    VolunteerID VARCHAR(50) NOT NULL,
    DispatchDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    TransitStatus ENUM('pending', 'in_transit', 'delivered', 'cancelled') NOT NULL DEFAULT 'in_transit',
    CONSTRAINT fk_dsp_req FOREIGN KEY (RequestID) REFERENCES Request(RequestID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_dsp_hub FOREIGN KEY (HubID) REFERENCES Supply_Hub(HubID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_dsp_camp FOREIGN KEY (CampID) REFERENCES Relief_Camp(CampID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_dsp_vol FOREIGN KEY (VolunteerID) REFERENCES Volunteer(VolunteerID) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Dispatch Items
CREATE TABLE Dispatch_Item (
    DispatchID VARCHAR(50) NOT NULL,
    ItemID VARCHAR(50) NOT NULL,
    QuantityDispatched INT NOT NULL CHECK (QuantityDispatched > 0),
    PRIMARY KEY (DispatchID, ItemID),
    CONSTRAINT fk_di_dsp FOREIGN KEY (DispatchID) REFERENCES Dispatch(DispatchID) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_di_item FOREIGN KEY (ItemID) REFERENCES Inventory(ItemID) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Camp Inventory
CREATE TABLE Camp_Inventory (
    InventoryID VARCHAR(50) PRIMARY KEY,
    CampID VARCHAR(50) NOT NULL,
    ItemName VARCHAR(100) NOT NULL,
    Category ENUM('Water', 'Food', 'Medical', 'Shelter', 'Other') NOT NULL,
    Count INT NOT NULL CHECK (Count >= 0),
    Unit VARCHAR(30) NOT NULL,
    LastLogged TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ci_camp FOREIGN KEY (CampID) REFERENCES Relief_Camp(CampID) ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE KEY uq_camp_item (CampID, ItemName)
) ENGINE=InnoDB;

-- Stored procedure for dispatch transaction
DELIMITER //

CREATE PROCEDURE ExecuteDispatchTransaction(
    IN in_dispatch_id VARCHAR(50),
    IN in_request_id VARCHAR(50),
    IN in_volunteer_id VARCHAR(50),
    IN in_hub_id VARCHAR(50),
    IN in_item_id VARCHAR(50),
    IN in_quantity INT
)
proc_label: BEGIN
    DECLARE v_avail VARCHAR(30);
    DECLARE v_stock INT;
    DECLARE v_camp_id VARCHAR(50);

    START TRANSACTION;

    -- 1. Check volunteer availability
    SELECT Availability INTO v_avail FROM Volunteer WHERE VolunteerID = in_volunteer_id FOR UPDATE;
    IF v_avail != 'available' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Volunteer already assigned. Select another available volunteer.';
    END IF;

    -- 2. Check stock availability
    SELECT QuantityAvailable INTO v_stock FROM Inventory WHERE ItemID = in_item_id FOR UPDATE;
    IF v_stock < in_quantity THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient inventory available in selected hub stock.';
    END IF;

    -- 3. Lookup CampID for request
    SELECT CampID INTO v_camp_id FROM Request WHERE RequestID = in_request_id;

    -- 4. Deduct Inventory
    UPDATE Inventory SET QuantityAvailable = QuantityAvailable - in_quantity WHERE ItemID = in_item_id;

    -- 5. Insert Dispatch record
    INSERT INTO Dispatch (DispatchID, RequestID, HubID, CampID, VolunteerID, DispatchDate, TransitStatus)
    VALUES (in_dispatch_id, in_request_id, in_hub_id, v_camp_id, in_volunteer_id, NOW(), 'in_transit');

    -- 6. Insert Dispatch_Item bridge record
    INSERT INTO Dispatch_Item (DispatchID, ItemID, QuantityDispatched)
    VALUES (in_dispatch_id, in_item_id, in_quantity);

    -- 7. Update Volunteer and Request
    UPDATE Volunteer SET Availability = 'assigned' WHERE VolunteerID = in_volunteer_id;
    UPDATE Request SET Status = 'in_transit' WHERE RequestID = in_request_id;

    COMMIT;
END //

DELIMITER ;
