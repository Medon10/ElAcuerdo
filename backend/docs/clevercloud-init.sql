-- Clever Cloud MySQL init for tp-backend (structure + data)
-- Run this against your existing Clever Cloud database (no CREATE DATABASE / USE here)

SET NAMES utf8mb4;
-- Default schema for import on Clever Cloud
USE `belhffd0tgbieogyw9px`;
SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

-- Drop in reverse dependency order
DROP TABLE IF EXISTS `favorites`;
DROP TABLE IF EXISTS `reservations`;
DROP TABLE IF EXISTS `flights`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `destinies`;

-- Tables
CREATE TABLE `destinies` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `transporte` json DEFAULT NULL,
  `actividades` json DEFAULT NULL,
  `created_at` date NOT NULL,
  `updated_at` date NOT NULL,
  `imagen` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `users` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `apellido` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `telefono` varchar(255) DEFAULT NULL,
  `created_at` date NOT NULL,
  `updated_at` date NOT NULL,
  `rol` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  UNIQUE KEY `users_telefono_unique` (`telefono`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `flights` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `fechahora_salida` varchar(255) NOT NULL,
  `fechahora_llegada` varchar(255) NOT NULL,
  `duracion` int NOT NULL,
  `aerolinea` varchar(255) NOT NULL,
  `cantidad_asientos` int NOT NULL,
  `montoVuelo` int NOT NULL,
  `origen` varchar(255) NOT NULL,
  `destino_id` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `capacidad_restante` int NOT NULL,
  `distancia_km` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `flights_destino_id_index` (`destino_id`),
  CONSTRAINT `flights_destino_id_foreign` FOREIGN KEY (`destino_id`) REFERENCES `destinies` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=55 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `reservations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `fecha_reserva` varchar(255) NOT NULL,
  `valor_reserva` int NOT NULL,
  `estado` varchar(255) NOT NULL,
  `usuario_id` int unsigned NOT NULL,
  `flight_id` int unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `reservations_usuario_id_index` (`usuario_id`),
  KEY `reservations_flight_id_index` (`flight_id`),
  CONSTRAINT `reservations_flight_id_foreign` FOREIGN KEY (`flight_id`) REFERENCES `flights` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `reservations_usuario_id_foreign` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `favorites` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `created_at` date NOT NULL,
  `updated_at` date NOT NULL,
  `flight_id` int unsigned NOT NULL,
  `user_id` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `favorites_flight_id_index` (`flight_id`),
  KEY `favorites_user_id_index` (`user_id`),
  CONSTRAINT `favorites_flight_id_foreign` FOREIGN KEY (`flight_id`) REFERENCES `flights` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `favorites_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Data (in dependency order)
LOCK TABLES `destinies` WRITE;
INSERT INTO `destinies` VALUES 
(1,'Venecia','["Bote", "Kayak"]','["Comida", "Paseo"]','2025-08-10','2025-09-30','/uploads/destinos/Venecia.jpg'),
(2,'Buenos Aires','["Auto", "Bicicleta"]','["Cultura", "Deporte"]','2025-08-10','2025-09-30','/uploads/destinos/BuenosAires.jpg'),
(3,'Tierra del Fuego','["Auto"]','["Nieve", "Sky"]','2025-08-12','2025-09-30','/uploads/destinos/TierraDelFuego.jpg'),
(4,'Pisos Picados','["Colectivo", "Auto"]','["Paisaje", "Minijuegos"]','2025-08-13','2025-09-30','/uploads/destinos/PisosPicados.jpg'),
(5,'Kino Der Toten','["Colectivo", "Bicicleta"]','["Juegos", "Armas"]','2025-08-14','2025-09-30','/uploads/destinos/KinoDerToten.jpeg'),
(6,'Japón','["Metro", "Tren bala"]','["Templos", "Sushi", "Monte Fuji"]','2025-10-01','2025-10-02','/uploads/destinos/Japon.jpg'),
(7,'Grecia','["Ferry", "Auto"]','["Playas", "Ruinas", "Gastronomía"]','2025-10-01','2025-10-01','/uploads/destinos/Grecia.jpeg'),
(8,'Tailandia','["Tuk-tuk", "Bote"]','["Templos", "Playas", "Comida callejera"]','2025-10-01','2025-10-01','/uploads/destinos/Tailandia.jpg'),
(9,'Islandia','["Auto", "Avión"]','["Auroras", "Géiseres", "Cascadas"]','2025-10-01','2025-10-01','/uploads/destinos/Islandia.jpeg'),
(10,'Perú','["Bus", "Tren"]','["Machu Picchu", "Gastronomía", "Senderismo"]','2025-10-01','2025-10-01','/uploads/destinos/Peru.jpg'),
(11,'Australia','["Auto", "Avión"]','["Buceo", "Surf", "Vida salvaje"]','2025-10-01','2025-10-02','/uploads/destinos/Australia.jpeg'),
(12,'Egipto','["Bus", "Crucero"]','["Pirámides", "Museo", "Nilo"]','2025-10-01','2025-10-01','/uploads/destinos/Egipto.jpeg'),
(13,'Nueva Zelanda','["Auto", "Ferry"]','["Senderismo", "Aventura", "Fiordos"]','2025-10-01','2025-10-01','/uploads/destinos/NuevaZelanda.jpeg'),
(14,'Marruecos','["Auto", "Camello"]','["Desierto", "Zocos", "Arquitectura"]','2025-10-01','2025-10-01','/uploads/destinos/Marruecos.jpeg'),
(15,'Noruega','["Ferry", "Tren"]','["Fiordos", "Auroras", "Senderismo"]','2025-10-01','2025-10-01','/uploads/destinos/Noruega.jpeg');
UNLOCK TABLES;

LOCK TABLES `users` WRITE;
INSERT INTO `users` VALUES 
(1,'Juampi','Binomio','juanbinomio@gmail.com','jb01011001','5434150654','2025-08-10','2025-08-10','cliente'),
(2,'Kevin','Dolver','kevindovler888@gmail.com','kd05052005','54341509973','2025-08-10','2025-08-10','cliente'),
(3,'Placeholder','User','placeholder@example.com','$2b$10$c67//sObLPNRxEV27rt06O5hGvFbQxDdeVMLAZpvw4FEYPxTLpKb.','0000000000','2025-08-11','2025-08-11','cliente'),
(4,'Nicolas','Muzzio','Nicogmuzz@gmail.com','ngm19980202','6723544532','2025-08-13','2025-08-13','cliente'),
(5,'Gerardo','Ballesteros','Balle@gmail.com','gcb20050109','2473505099','2025-08-14','2025-08-14','cliente'),
(6,'Medon','Tusa','zukueasy@gmail.com','$2b$10$c67//sObLPNRxEV27rt06O5hGvFbQxDdeVMLAZpvw4FEYPxTLpKb.','2473522088','2025-09-17','2025-10-15','admin'),
(11,'Juan','Armendares','juanarmen@hotmail.com','$2b$10$ipD1CFFDSpQEnSMzV0jSHereu7SHKvZj83vbEFgaDayJgSvzSIEVS',NULL,'2025-09-20','2025-09-20','cliente'),
(12,'Mateo','Medón','mateomedonn@gmail.com','$2b$10$vOMu7/2Ni7BFXmUfqLi7Du0W7uGZPYfDN4BxtG//GB5TNtI7SPssm',NULL,'2025-10-15','2025-10-15',NULL),
(13,'propuesta','Medón','mateom222edonn@gmail.com','$2b$10$5wAi8CZOHa0gQHTdh6QWD.ehCmRIArc7GHPWD9eK0.yd7I9yewXFC',NULL,'2025-10-15','2025-10-15',NULL),
(14,'propuesta','Medón','jartigau@simplemak.com.ar','$2b$10$sD1nvQ8cXuY0PWMPDAg25.HTtOybGDDdP/Xfr2sRH3eFGtxHY7QjS',NULL,'2025-10-15','2025-10-15',NULL);
UNLOCK TABLES;

LOCK TABLES `flights` WRITE;
INSERT INTO `flights` VALUES 
(2,'2026-05-08 13:00:00.000','2026-05-08 17:00:00.000',4,'Flybondi',150,500,'Buenos Aires',1,'2025-08-11 03:00:00','2025-10-15 18:32:03',76,10000),
(3,'2026-02-14 9:00','2026-02-14 16:00',7,'Despegar',270,1000,'Barcelona',2,'2025-08-12 03:00:00','2025-10-14 02:10:38',144,10300),
(4,'2020-12-24 17:00','2020-12-24 19:00',2,'Iberia',100,300,'Ciudad Comercio',4,'2025-08-13 03:00:00','2025-10-14 02:10:38',13,8500),
(5,'2019-12-24 17:00','2019-12-24 19:00',2,'Flybondi',200,500,'Nuketown',5,'2025-08-14 03:00:00','2025-10-14 02:10:38',10,11500),
(6,'2026-11-15 08:00:00','2026-11-15 23:30:00',930,'Alitalia',180,1200,'Buenos Aires',1,'2025-10-04 03:00:00','2025-10-14 02:10:38',155,10000),
(7,'2026-11-20 14:00:00','2026-11-21 05:30:00',930,'LATAM',200,1350,'Buenos Aires',1,'2025-10-04 03:00:00','2025-10-14 02:10:38',31,10000),
(8,'2026-12-01 22:00:00','2026-12-02 13:30:00',930,'Aerolíneas Argentinas',150,1100,'Buenos Aires',1,'2025-10-04 03:00:00','2025-10-14 02:10:38',30,10000),
(9,'2026-10-10 10:30:00','2026-12-11 02:00:00',930,'ITA Airways',190,1280,'Buenos Aires',1,'2025-10-04 03:00:00','2025-10-14 02:10:38',104,10000),
(10,'2026-01-18 09:00:00','2026-01-18 11:15:00',135,'Aerolíneas Argentinas',150,250,'Córdoba',2,'2025-10-04 03:00:00','2025-10-14 02:10:38',19,700),
(11,'2026-03-25 15:30:00','2026-03-25 18:00:00',150,'Flybondi',180,180,'Mendoza',2,'2025-10-04 03:00:00','2025-10-14 02:10:38',178,1000),
(12,'2026-02-05 07:00:00','2026-02-05 10:30:00',210,'JetSmart',160,320,'Salta',2,'2025-10-04 03:00:00','2025-10-14 02:10:38',91,1600),
(13,'2026-09-12 06:00:00','2026-09-12 09:45:00',225,'Aerolíneas Argentinas',140,450,'Japón',3,'2025-10-04 03:00:00','2025-10-14 02:10:38',123,12000),
(14,'2026-10-22 13:00:00','2026-10-22 16:45:00',225,'LATAM',150,480,'Buenos Aires',3,'2025-10-04 03:00:00','2025-10-14 02:10:38',104,3000),
(15,'2026-09-08 10:00:00','2026-09-08 13:45:00',225,'Flybondi',180,420,'Grecia',3,'2025-10-04 03:00:00','2025-10-14 02:10:38',152,12000),
(16,'2026-04-18 23:00:00','2026-04-19 20:30:00',1950,'Japan Airlines',250,1290,'Venecia',6,'2025-10-04 03:00:00','2025-10-14 02:10:38',32,10000),
(17,'2026-03-28 20:00:00','2026-03-29 20:30:00',1950,'ANA',280,1570,'Buenos Aires',6,'2025-10-04 03:00:00','2025-10-14 02:10:38',31,10000),
(18,'2026-02-03 19:30:00','2026-02-04 20:00:00',1570,'LATAM',220,1570,'Pisos Picados',6,'2025-10-04 03:00:00','2025-10-14 02:10:38',39,10000),
(19,'2026-01-15 22:00:00','2026-01-16 22:00:00',1540,'Emirates',300,1540,'Kino Der Toten',6,'2025-10-04 03:00:00','2025-10-14 02:10:38',166,10000),
(20,'2026-11-10 15:00:00','2026-11-11 09:00:00',1080,'Aegean Airlines',180,1250,'Islandia',7,'2025-10-04 03:00:00','2025-10-14 02:10:38',41,8000),
(21,'2026-11-24 11:00:00','2026-11-25 05:00:00',1080,'Turkish Airlines',200,1320,'Perú',7,'2025-10-04 03:00:00','2025-10-14 02:10:38',100,8000),
(22,'2026-12-07 16:30:00','2026-12-08 10:30:00',1080,'Lufthansa',190,1400,'Buenos Aires',7,'2025-10-04 03:00:00','2025-10-14 02:10:38',154,8000),
(23,'2026-11-14 21:00:00','2026-11-16 14:00:00',2460,'Qatar Airways',280,1650,'Australia',8,'2025-10-04 03:00:00','2025-10-14 02:10:38',158,9500),
(24,'2026-11-26 18:00:00','2026-11-28 11:00:00',2460,'Emirates',300,1700,'Grecia',8,'2025-10-04 03:00:00','2025-10-14 02:10:38',114,9500),
(25,'2026-12-09 20:30:00','2026-12-11 13:30:00',2460,'Thai Airways',250,1580,'Japón',8,'2025-10-04 03:00:00','2025-10-14 02:10:38',54,9500),
(26,'2026-08-16 12:00:00','2026-08-17 06:00:00',1080,'Icelandair',160,1400,'Buenos Aires',9,'2025-10-04 03:00:00','2025-10-14 02:10:38',149,13000),
(27,'2026-07-29 14:30:00','2026-07-30 08:30:00',1080,'LATAM',180,1450,'Tailandia',9,'2025-10-04 03:00:00','2025-10-14 02:10:38',5,13000),
(28,'2026-05-12 10:00:00','2026-05-13 04:00:00',1080,'Air France',200,1500,'Egipto',9,'2025-10-04 03:00:00','2025-10-14 02:10:38',66,13000),
(29,'2026-06-11 08:30:00','2026-06-11 13:00:00',270,'LATAM',180,380,'Egipto',10,'2025-10-04 03:00:00','2025-10-14 02:10:38',104,4500),
(30,'2026-06-21 11:00:00','2026-06-21 15:30:00',270,'Aerolíneas Argentinas',160,400,'Grecia',10,'2025-10-04 03:00:00','2025-10-14 02:10:38',144,4500),
(31,'2026-07-04 15:30:00','2026-07-04 20:00:00',270,'JetSmart',150,350,'Buenos Aires',10,'2025-10-04 03:00:00','2025-10-14 02:10:38',117,4500),
(32,'2026-08-18 07:00:00','2026-08-18 11:30:00',270,'Sky Airline',170,360,'Tierra Del Fuego',10,'2025-10-04 03:00:00','2025-10-14 02:10:38',34,4500),
(33,'2026-05-13 22:00:00','2026-05-15 18:00:00',2640,'Qantas',300,2000,'Grecia',11,'2025-10-04 03:00:00','2025-10-14 02:10:38',197,15000),
(34,'2026-03-27 20:00:00','2026-03-29 16:00:00',2640,'LATAM',280,1950,'Nueva Zelanda',11,'2025-10-04 03:00:00','2025-10-14 02:10:38',192,15000),
(35,'2026-02-06 23:30:00','2026-02-08 19:30:00',2640,'Emirates',320,2150,'Egipto',11,'2025-10-04 03:00:00','2025-10-14 02:10:38',145,15000),
(36,'2026-05-17 16:00:00','2026-05-18 12:00:00',1200,'EgyptAir',200,1350,'Australia',12,'2025-10-04 03:00:00','2025-10-14 02:10:38',44,12500),
(37,'2026-04-30 13:00:00','2026-05-01 09:00:00',1200,'Turkish Airlines',220,1400,'Buenos Aires',12,'2025-10-04 03:00:00','2025-10-14 02:10:38',161,12500),
(38,'2026-03-11 17:30:00','2026-03-12 13:30:00',1200,'Emirates',250,1500,'Tierra Del Fuego',12,'2025-10-04 03:00:00','2025-10-14 02:10:38',1,12500),
(39,'2026-11-19 21:00:00','2026-11-21 19:00:00',2820,'Air New Zealand',280,2100,'Egipto',13,'2025-10-04 03:00:00','2025-10-14 02:10:38',233,18000),
(40,'2026-10-02 19:30:00','2026-10-04 17:30:00',2820,'LATAM',260,2050,'Tailandia',13,'2025-10-04 03:00:00','2025-10-14 02:10:38',37,18000),
(41,'2026-09-14 22:00:00','2026-09-16 20:00:00',2820,'Qantas',300,2200,'Venecia',13,'2025-10-04 03:00:00','2025-10-14 02:10:38',65,18000),
(42,'2026-06-23 14:00:00','2026-06-24 07:00:00',1020,'Royal Air Maroc',180,1300,'Australia',14,'2025-10-04 03:00:00','2025-10-14 02:10:38',118,11000),
(43,'2026-07-05 12:30:00','2026-07-06 05:30:00',1020,'Turkish Airlines',200,1350,'Perú',14,'2025-10-04 03:00:00','2025-10-14 02:10:38',127,11000),
(44,'2026-01-17 15:00:00','2026-01-18 08:00:00',1020,'Air France',190,1400,'Noruega',14,'2025-10-04 03:00:00','2025-10-14 02:10:38',42,11000),
(45,'2026-03-25 13:00:00','2026-03-26 05:00:00',960,'Norwegian',180,1450,'Buenos Aires',15,'2025-10-04 03:00:00','2025-10-14 02:10:38',34,13500),
(46,'2026-02-08 11:30:00','2026-02-09 03:30:00',960,'KLM',200,1500,'Marruecos',15,'2025-10-04 03:00:00','2025-10-14 02:10:38',60,13500),
(47,'2026-01-19 14:00:00','2026-01-20 06:00:00',960,'Lufthansa',190,1550,'Islandia',15,'2025-10-04 03:00:00','2025-10-14 02:10:38',174,13500),
(48,'2026-02-12 06:00:00','2026-02-12 09:45:00',225,'Aerolíneas Argentinas',140,450,'Japón',4,'2025-10-05 02:48:45','2025-10-14 02:10:38',98,8500),
(49,'2026-03-22 13:00:00','2026-03-22 16:45:00',225,'LATAM',150,480,'Buenos Aires',4,'2025-10-05 02:48:45','2025-10-14 02:10:38',112,8500),
(50,'2026-02-08 10:00:00','2026-02-08 13:45:00',225,'Flybondi',180,420,'Grecia',4,'2025-10-05 02:48:45','2025-10-14 02:10:38',116,8500),
(51,'2026-02-18 22:00:00','2026-02-19 06:00:00',480,'Japan Airlines',250,1800,'Venecia',5,'2025-10-05 02:50:00','2025-10-14 02:10:38',246,11500),
(52,'2026-01-28 15:00:00','2026-01-28 23:00:00',480,'ANA',280,1900,'Buenos Aires',5,'2025-10-05 02:50:00','2025-10-14 02:10:38',276,11500),
(53,'2026-09-03 12:30:00','2026-09-03 23:30:00',660,'LATAM',220,1750,'Tierra Del Fuego',5,'2025-10-05 02:50:00','2025-10-14 02:10:38',216,11500),\
(54,'2026-10-15 10:00:00','2026-10-15 23:00:00',780,'Emirates',300,2100,'Kino Der Toten',5,'2025-10-05 02:50:00','2025-10-14 02:10:38',285,NULL);
UNLOCK TABLES;

LOCK TABLES `reservations` WRITE;
INSERT INTO `reservations` VALUES 
(3,'2025-12-08',700,'pendiente',3,3,'2025-08-12 03:00:00','2025-08-12 03:00:00'),
(4,'2022-01-08',250,'completado',4,4,'2025-08-13 03:00:00','2025-08-13 03:00:00'),
(5,'2029-01-09',350,'completado',5,5,'2025-08-14 03:00:00','2025-08-14 03:00:00'),
(6,'2021-03-02',450,'completado',1,2,'2025-09-09 03:00:00','2025-09-09 03:00:00'),
(8,'2025-10-07',400,'cancelado',6,54,'2025-10-08 13:25:16','2025-10-14 02:39:18'),
(9,'2025-12-07',200,'completado',6,22,'2025-10-08 13:27:10','2025-10-08 13:27:10'),
(10,'2025-10-15',500,'cancelado',6,2,'2025-10-15 18:32:03','2025-10-15 19:57:27');
UNLOCK TABLES;

LOCK TABLES `favorites` WRITE;
INSERT INTO `favorites` VALUES 
(9,'2025-10-13','2025-10-13',19,6);
UNLOCK TABLES;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
