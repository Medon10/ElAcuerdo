1. Instrucciones de Instalación y Puesta en Marcha
Para ejecutar el proyecto completo, es necesario levantar dos servidores de manera simultánea: el Backend (maneja la lógica y la base de datos) y el Frontend (la interfaz de usuario que ves en el navegador).

A. Backend (tp-backend)

Requisitos Previos:

Node.js (versión 18 o superior)

NPM (generalmente se instala con Node.js)

Un servidor de base de datos MySQL.
Pasos de Instalación:

Clonar el Repositorio:

Terminal

git clone https://github.com/Medon10/tp-backend.git
cd tp-backend
Instalar Dependencias:
Este comando descarga todas las librerías necesarias para el proyecto.

Terminal

npm install
Configurar la Base de Datos:

Asegúrate de que tu servidor MySQL esté corriendo.

Crea una nueva base de datos llamada VuelosApp.

Ejecuta los comandos del archivo docs/mysql-commands.sql para crear las tablas (users, flights, destinies, etc.).

Crear el Archivo de Entorno (.env):

En la raíz del proyecto tp-backend, crea un archivo llamado .env.

Añade la siguiente línea para la clave secreta de autenticación:

TOKEN_SECRET=unaclavesecretamuydificildeadivinar12345
Iniciar el Servidor:

Terminal

npm run dev
Si todo va bien, verás en la terminal el mensaje: Servidor corriendo en http://localhost:3000.

B. Frontend (tp-frontend)
El frontend es la aplicación de React que los usuarios ven y con la que interactúan.

Requisitos Previos:

Node.js (versión 18 o superior)

NPM

Pasos de Instalación:

Clonar el Repositorio:

Terminal

git clone https://github.com/Medon10/tp-frontend.git
cd tp-frontend
Instalar Dependencias:

Terminal

npm install
Iniciar el Servidor de Desarrollo:
Importante: Asegurarse de que el servidor del backend ya esté corriendo.

Terminal

npm run dev
La aplicación se abre automáticamente en el navegador en http://localhost:5173.