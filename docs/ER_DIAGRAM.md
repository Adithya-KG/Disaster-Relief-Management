# ER Diagram - Disaster Relief & Resource Distribution

Derived from `database/schema.sql` (SQLite) / `schema_mysql.sql` / `postgresql/schema.sql`.
GitHub renders the diagram below automatically.

```mermaid
erDiagram
    RELIEF_CAMP ||--o{ APP_USER : "assigned to"
    RELIEF_CAMP ||--o{ CAMP_INVENTORY : holds
    RELIEF_CAMP ||--o{ REQUEST : raises
    RELIEF_CAMP ||--o{ DISPATCH : receives
    SUPPLY_HUB  ||--o{ INVENTORY : stocks
    SUPPLY_HUB  ||--o{ DISPATCH : "ships from"
    REQUEST     ||--o| DISPATCH : "fulfilled by"
    VOLUNTEER   ||--o{ DISPATCH : drives
    DISPATCH    ||--|{ DISPATCH_ITEM : contains
    INVENTORY   ||--o{ DISPATCH_ITEM : "dispatched as"

    RELIEF_CAMP {
        varchar CampID PK
        varchar CampName
        varchar Location
        decimal Latitude
        decimal Longitude
        int CurrentPopulation
        int Capacity
        varchar ContactName
        varchar ContactPhone
        varchar ContactInfo
        varchar Zone
        enum StatusLevel
        timestamp LastUpdated
    }
    SUPPLY_HUB {
        varchar HubID PK
        varchar HubName
        varchar Location
        decimal Latitude
        decimal Longitude
        varchar Zone
        int Capacity
        varchar ContactInfo
    }
    INVENTORY {
        varchar ItemID PK
        varchar HubID FK
        varchar ItemName
        enum Category
        enum ShelfLifeCategory
        int QuantityAvailable
        int Threshold
        int CriticalThreshold
        varchar Unit
        date ShelfLifeDate
    }
    CAMP_INVENTORY {
        varchar InventoryID PK
        varchar CampID FK
        varchar ItemName
        enum Category
        int Count
        varchar Unit
        timestamp LastLogged
    }
    VOLUNTEER {
        varchar VolunteerID PK
        varchar Name
        varchar Phone
        text Skills
        enum VehicleAccess
        varchar AssignedZone
        enum Availability
    }
    REQUEST {
        varchar RequestID PK
        varchar CampID FK
        enum ItemCategory
        varchar ItemName
        int QuantityRequested
        varchar Unit
        enum UrgencyLevel
        timestamp RequestDate
        enum Status
    }
    DISPATCH {
        varchar DispatchID PK
        varchar RequestID FK "UNIQUE"
        varchar HubID FK
        varchar CampID FK
        varchar VolunteerID FK
        timestamp DispatchDate
        enum TransitStatus
    }
    DISPATCH_ITEM {
        varchar DispatchID PK, FK
        varchar ItemID PK, FK
        int QuantityDispatched
    }
    APP_USER {
        varchar UserID PK
        varchar Email "UNIQUE"
        varchar Password
        varchar FullName
        varchar Role
        varchar AssignedCampID FK
        timestamp CreatedAt
    }
```

## Notes
- `DISPATCH_ITEM` is the associative (bridge) table between `DISPATCH` and `INVENTORY`: composite PK (`DispatchID`, `ItemID`).
- `DISPATCH.RequestID` is UNIQUE, so a request has at most one dispatch (1 : 0..1).
- `CAMP_INVENTORY` has UNIQUE (`CampID`, `ItemName`).
- `StatusLevel` is maintained by triggers on `CAMP_INVENTORY`: Critical when water < 2 x population or food < 0.5 x population.
- `trg_prevent_volunteer_double_booking` blocks dispatching a volunteer who is already assigned (API returns 409).
