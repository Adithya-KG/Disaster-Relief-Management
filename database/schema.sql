-- ============================================================================
-- Course: 23CSE202 DATABASE MANAGEMENT SYSTEMS
-- Project: Disaster Relief & Resource Distribution Database
-- Relational Schema DDL (3.3 Relational Schema from Design Document)
-- ============================================================================

PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS App_User;
DROP TABLE IF EXISTS Dispatch_Item;
DROP TABLE IF EXISTS Dispatch;
DROP TABLE IF EXISTS Request;
DROP TABLE IF EXISTS Camp_Inventory;
DROP TABLE IF EXISTS Inventory;
DROP TABLE IF EXISTS Volunteer;
DROP TABLE IF EXISTS Supply_Hub;
DROP TABLE IF EXISTS Relief_Camp;

-- 1. Relief_Camp
-- Relief_Camp (CampID (PK), CampName, Location, Latitude, Longitude, CurrentPopulation, ContactInfo, StatusLevel)
CREATE TABLE Relief_Camp (
    CampID VARCHAR(50) PRIMARY KEY,
    CampName VARCHAR(100) NOT NULL,
    Location VARCHAR(200) NOT NULL,
    Latitude REAL NOT NULL,
    Longitude REAL NOT NULL,
    CurrentPopulation INTEGER NOT NULL CHECK (CurrentPopulation >= 0),
    Capacity INTEGER NOT NULL DEFAULT 1000 CHECK (Capacity >= CurrentPopulation),
    ContactName VARCHAR(100),
    ContactPhone VARCHAR(30) NOT NULL,
    ContactInfo VARCHAR(200),
    Zone VARCHAR(50) DEFAULT 'General',
    StatusLevel VARCHAR(30) NOT NULL DEFAULT 'Normal' CHECK (StatusLevel IN ('Normal', 'Moderate', 'Critical Level')),
    LastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Supply_Hub
-- Supply_Hub (HubID (PK), HubName, Location, Capacity, ContactInfo)
CREATE TABLE Supply_Hub (
    HubID VARCHAR(50) PRIMARY KEY,
    HubName VARCHAR(100) NOT NULL,
    Location VARCHAR(200) NOT NULL,
    Latitude REAL NOT NULL,
    Longitude REAL NOT NULL,
    Zone VARCHAR(50) NOT NULL,
    Capacity INTEGER NOT NULL CHECK (Capacity > 0),
    ContactInfo VARCHAR(200)
);

-- 3. Inventory
-- Inventory (ItemID (PK), HubID (FK -> Supply_Hub.HubID), ItemName, Category, QuantityAvailable, Unit, ShelfLifeDate)
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
    FOREIGN KEY (HubID) REFERENCES Supply_Hub(HubID) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 4. Volunteer
-- Volunteer (VolunteerID (PK), Name, Phone, Skills, VehicleAccess, AssignedZone)
CREATE TABLE Volunteer (
    VolunteerID VARCHAR(50) PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(30) NOT NULL,
    Skills TEXT NOT NULL, -- Stored as comma-separated or JSON list (e.g. 'Heavy vehicle, Radio')
    VehicleAccess VARCHAR(50) NOT NULL CHECK (VehicleAccess IN ('Truck', 'Van', 'Motorbike', 'None')),
    AssignedZone VARCHAR(50) NOT NULL,
    Availability VARCHAR(30) NOT NULL DEFAULT 'available' CHECK (Availability IN ('available', 'assigned', 'standby'))
);

-- 5. Request
-- Request (RequestID (PK), CampID (FK -> Relief_Camp.CampID), ItemCategory, ItemName, QuantityRequested, UrgencyLevel, RequestDate, Status)
CREATE TABLE Request (
    RequestID VARCHAR(50) PRIMARY KEY,
    CampID VARCHAR(50) NOT NULL,
    ItemCategory VARCHAR(50) NOT NULL CHECK (ItemCategory IN ('Water', 'Food', 'Medical', 'Shelter', 'Other')),
    ItemName VARCHAR(100) NOT NULL,
    QuantityRequested INTEGER NOT NULL CHECK (QuantityRequested > 0),
    Unit VARCHAR(30) NOT NULL,
    UrgencyLevel VARCHAR(30) NOT NULL DEFAULT 'medium' CHECK (UrgencyLevel IN ('critical', 'high', 'medium', 'low')),
    RequestDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (Status IN ('pending', 'in_transit', 'fulfilled', 'cancelled')),
    FOREIGN KEY (CampID) REFERENCES Relief_Camp(CampID) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 6. Dispatch
-- Dispatch (DispatchID (PK), RequestID (FK -> Request.RequestID), HubID (FK -> Supply_Hub.HubID), CampID (FK -> Relief_Camp.CampID), VolunteerID (FK -> Volunteer.VolunteerID), DispatchDate, TransitStatus)
CREATE TABLE Dispatch (
    DispatchID VARCHAR(50) PRIMARY KEY,
    RequestID VARCHAR(50) NOT NULL UNIQUE, -- 1:1 relationship with Request
    HubID VARCHAR(50) NOT NULL,
    CampID VARCHAR(50) NOT NULL,
    VolunteerID VARCHAR(50) NOT NULL,
    DispatchDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    TransitStatus VARCHAR(30) NOT NULL DEFAULT 'in_transit' CHECK (TransitStatus IN ('pending', 'in_transit', 'delivered', 'cancelled')),
    FOREIGN KEY (RequestID) REFERENCES Request(RequestID) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (HubID) REFERENCES Supply_Hub(HubID) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (CampID) REFERENCES Relief_Camp(CampID) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (VolunteerID) REFERENCES Volunteer(VolunteerID) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 7. Dispatch_Item
-- Dispatch_Item (DispatchID (PK, FK -> Dispatch.DispatchID), ItemID (PK, FK -> Inventory.ItemID), QuantityDispatched)
-- Composite primary key resolving N:M between Dispatch and Inventory
CREATE TABLE Dispatch_Item (
    DispatchID VARCHAR(50) NOT NULL,
    ItemID VARCHAR(50) NOT NULL,
    QuantityDispatched INTEGER NOT NULL CHECK (QuantityDispatched > 0),
    PRIMARY KEY (DispatchID, ItemID),
    FOREIGN KEY (DispatchID) REFERENCES Dispatch(DispatchID) ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (ItemID) REFERENCES Inventory(ItemID) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 8. Camp_Inventory (Camp On-Site Logged Stock)
-- Tracks on-site stock logged by camp managers to evaluate the 24-hr buffer rule
CREATE TABLE Camp_Inventory (
    InventoryID VARCHAR(50) PRIMARY KEY,
    CampID VARCHAR(50) NOT NULL,
    ItemName VARCHAR(100) NOT NULL,
    Category VARCHAR(50) NOT NULL CHECK (Category IN ('Water', 'Food', 'Medical', 'Shelter', 'Other')),
    Count INTEGER NOT NULL CHECK (Count >= 0),
    Unit VARCHAR(30) NOT NULL,
    LastLogged TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (CampID) REFERENCES Relief_Camp(CampID) ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE (CampID, ItemName)
);

-- 9. App_User (User Accounts & Authentication)
-- Stores login credentials, assigned role, and assigned camp for access control
CREATE TABLE App_User (
    UserID VARCHAR(50) PRIMARY KEY,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Password VARCHAR(100) NOT NULL,
    FullName VARCHAR(100) NOT NULL,
    Role VARCHAR(30) NOT NULL CHECK (Role IN ('dispatcher', 'camp_manager')),
    AssignedCampID VARCHAR(50),
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (AssignedCampID) REFERENCES Relief_Camp(CampID) ON UPDATE CASCADE ON DELETE SET NULL
);
