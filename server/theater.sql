
PRAGMA foreign_keys = ON;

BEGIN;

-- Users Table
CREATE TABLE IF NOT EXISTS "users" (
    "id" INTEGER NOT NULL, 
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT NULL,
    "admin" BOOLEAN NOT NULL DEFAULT 0, 
    "hash" TEXT NOT NULL,              
    "salt" TEXT NOT NULL,
    "secret" TEXT,                      
    "lastTotpStep" INTEGER,             
    PRIMARY KEY("id" AUTOINCREMENT)
);



-- Seats in the theater
CREATE TABLE IF NOT EXISTS "seats" (
    "row_label" TEXT NOT NULL, 
    "seat_number" INTEGER NOT NULL,
    "category" TEXT NOT NULL,          
    "reservation_id" INTEGER DEFAULT NULL,
    PRIMARY KEY (row_label, seat_number),
    FOREIGN KEY (reservation_id) REFERENCES reservations(reservation_id) ON DELETE SET NULL,
    CONSTRAINT check_category_by_row CHECK (
        (row_label IN ('A', 'B') AND category = 'premium') OR
        (row_label NOT IN ('A', 'B') AND category = 'normal')
    )
);



-- Reservation list
CREATE TABLE IF NOT EXISTS "reservations" (
    "reservation_id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);


--  Temporary Log for Released Seats

CREATE TABLE IF NOT EXISTS "released_seats_log" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,        
    "row_label" TEXT NOT NULL,
    "seat_number" INTEGER NOT NULL,
    "released_at" INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
-- Users   PASSWORD exam
INSERT INTO "users" VALUES(1, 'a@p.it', 'Mario', 1, 'adf0ced202b7e834aad77920affd822a1387876f0f0811503001f60a2822f5b15434272bb3d28b09e0c4d25cdc3b0c12c347de1d2c4df4141f7cbe104f80a121', '45309004e843a572','LXBSMDTMSP2I5XFXIYRGFVWSFI',0); 
INSERT INTO "users" VALUES(2, 'b@p.it', 'Luigi', 1, '7cba4a33ffd894e2509476fb7d28d3c00bedef46a35955f157abf3a3e97de4daa553b75c32172aa34ea60be89287faa98ef2721352a36452bd33ea329b9bc047', 'b57b96cbf4395978','LXBSMDTMSP2I5XFXIYRGFVWSFI',0);  
INSERT INTO "users" VALUES(3, 'l@p.it', 'Letizia', 0, '783e82670cda339134878398c86349d81c6fab4497bd9b6910121d592e474109b82f94c478aa13820450228639d9c53e2408c22aaa3babce2d37a6876904cfbb', 'feca9e61c29558a7','', 0);
INSERT INTO "users" VALUES(4, 'm@p.it', 'Maria', 0, '711c65908ae9acf6be833bd454350d4c61e873cbccc5f4c37951043a6aba4aa111adb4e08456e8d10655817c4e88e102208f2e85e9b75c70743c95482d9e1684', '3387fd0c0e789d26','', 0);


-- Reservation made by an admin (id reservation, id_user) 
INSERT INTO "reservations" VALUES(1, 1);
INSERT INTO "reservations" VALUES(2, 1);
-- Reservation made by a normal user
INSERT INTO "reservations" VALUES(3, 3);
INSERT INTO "reservations" VALUES(4, 3);

--Seats in the theater
-- (100 seats total - 4 different row lengths - 5 rows)
-- Rows A, B: Premium
-- Rows C, D, E: Normal

-- Row A - 16 seats
INSERT INTO "seats" (row_label, seat_number, category) VALUES ('A',1,'premium'),('A',2,'premium'),('A',3,'premium'),('A',4,'premium'),('A',5,'premium'),('A',6,'premium'),('A',7,'premium'),('A',8,'premium'),('A',9,'premium'),('A',10,'premium'),('A',11,'premium'),('A',12,'premium'),('A',13,'premium'),('A',14,'premium'),('A',15,'premium'),('A',16,'premium');

-- Row B - 18 seats)
INSERT INTO "seats" (row_label, seat_number, category) VALUES ('B',1,'premium'),('B',2,'premium'),('B',3,'premium'),('B',4,'premium'),('B',5,'premium'),('B',6,'premium'),('B',7,'premium'),('B',8,'premium'),('B',9,'premium'),('B',10,'premium'),('B',11,'premium'),('B',12,'premium'),('B',13,'premium'),('B',14,'premium'),('B',15,'premium'),('B',16,'premium'),('B',17,'premium'),('B',18,'premium');

-- Row C - 22 seats)
INSERT INTO "seats" (row_label, seat_number, category) VALUES ('C',1,'normal'),('C',2,'normal'),('C',3,'normal'),('C',4,'normal'),('C',5,'normal'),('C',6,'normal'),('C',7,'normal'),('C',8,'normal'),('C',9,'normal'),('C',10,'normal'),('C',11,'normal'),('C',12,'normal'),('C',13,'normal'),('C',14,'normal'),('C',15,'normal'),('C',16,'normal'),('C',17,'normal'),('C',18,'normal'),('C',19,'normal'),('C',20,'normal'),('C',21,'normal'),('C',22,'normal');

-- Row D - 22 seats)
INSERT INTO "seats" (row_label, seat_number, category) VALUES ('D',1,'normal'),('D',2,'normal'),('D',3,'normal'),('D',4,'normal'),('D',5,'normal'),('D',6,'normal'),('D',7,'normal'),('D',8,'normal'),('D',9,'normal'),('D',10,'normal'),('D',11,'normal'),('D',12,'normal'),('D',13,'normal'),('D',14,'normal'),('D',15,'normal'),('D',16,'normal'),('D',17,'normal'),('D',18,'normal'),('D',19,'normal'),('D',20,'normal'),('D',21,'normal'),('D',22,'normal');

-- Row E - 22 seats)
INSERT INTO "seats" (row_label, seat_number, category) VALUES ('E',1,'normal'),('E',2,'normal'),('E',3,'normal'),('E',4,'normal'),('E',5,'normal'),('E',6,'normal'),('E',7,'normal'),('E',8,'normal'),('E',9,'normal'),('E',10,'normal'),('E',11,'normal'),('E',12,'normal'),('E',13,'normal'),('E',14,'normal'),('E',15,'normal'),('E',16,'normal'),('E',17,'normal'),('E',18,'normal'),('E',19,'normal'),('E',20,'normal'),('E',21,'normal'),('E',22,'normal');



-- Seats for Reservation 1 (seats row, number, category )
UPDATE "seats" SET reservation_id = 1 WHERE row_label = 'A' AND seat_number = 1;
-- Seats for Reservation 2 
UPDATE "seats" SET reservation_id = 2 WHERE row_label = 'C' AND seat_number IN (1, 2);
-- Seats for Reservation 3 
UPDATE "seats" SET reservation_id = 3 WHERE row_label = 'C' AND seat_number IN (4, 5);
-- Seats for Reservation 4 
UPDATE "seats" SET reservation_id = 4 WHERE row_label = 'A' AND seat_number = 8;


COMMIT;



