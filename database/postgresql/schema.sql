DROP TABLE IF EXISTS App_User CASCADE;
DROP TABLE IF EXISTS Dispatch_Item CASCADE;
DROP TABLE IF EXISTS Dispatch CASCADE;
DROP TABLE IF EXISTS Request CASCADE;
DROP TABLE IF EXISTS Camp_Inventory CASCADE;
DROP TABLE IF EXISTS Inventory CASCADE;
DROP TABLE IF EXISTS Volunteer CASCADE;
DROP TABLE IF EXISTS Supply_Hub CASCADE;
DROP TABLE IF EXISTS Relief_Camp CASCADE;

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
