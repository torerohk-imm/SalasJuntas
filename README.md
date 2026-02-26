# Salas de Juntas

Plataforma full-stack para visualizar la ocupación semanal de salas de juntas conectada a Microsoft Graph (OAuth 2.0), con fallback de datos mock para desarrollo local.

---


## Guía en PDF

Para un formato listo para compartir/imprimir, consulta:

- `docs/Guia-Implementacion-Apache.pdf`

La fuente editable de esa guía está en:

- `docs/Guia-Implementacion-Apache.md`

---

## 1) Arquitectura de la solución

La solución se divide en dos capas:

- **Frontend (React + Vite)**: interfaz visual de salas, calendario semanal, estado de ocupación, aviso configurable y panel básico.
- **Backend (Node.js + Express)**: endpoints `/api` para autenticación OAuth, lectura de salas/eventos desde Microsoft Graph y gestión de aviso.

En producción con Apache:

- Apache sirve el frontend estático.
- Apache reenvía `/api/*` al backend Node local (`127.0.0.1:4000`).

---

## 2) Requisitos previos

### 2.1 Sistema operativo y software

- Linux (Ubuntu/Debian recomendado)
- Apache 2.4+
- Node.js 20+
- npm 10+
- systemd (normalmente ya disponible en Ubuntu/Debian)

### 2.2 Cuenta de Microsoft 365 / Azure AD

Debes tener:

- Tenant de Microsoft Entra ID (Azure AD)
- App registrada en Azure
- Permisos Graph para leer salas/calendarios
- Salas de juntas configuradas como recursos de calendario en Microsoft 365

---

## 3) Configuración de Azure AD / Microsoft Graph (paso a paso)

1. Entra a **Azure Portal** → **App registrations** → **New registration**.
2. Define un nombre (ej. `salas-juntas-web`).
3. Tipo de cuenta: normalmente "Single tenant".
4. Redirect URI (Web):
   - Desarrollo: `http://localhost:5173/`
   - Producción: `https://TU_DOMINIO/`
5. Crear registro.
6. Guarda estos valores:
   - **Directory (tenant) ID**
   - **Application (client) ID**
7. Ve a **Certificates & secrets** → **New client secret** y guarda el valor.
8. Ve a **API permissions** y agrega permisos de Microsoft Graph:
   - `Calendars.Read`
   - `User.Read`
   - `Places.Read.All`
9. Presiona **Grant admin consent** para el tenant.

> Si no haces "Grant admin consent", el flujo OAuth puede fallar aun con credenciales correctas.

---

## 4) Instalación local para desarrollo

### 4.1 Clonar y preparar

```bash
git clone <URL_DEL_REPO>
cd SalasJuntas
cp .env.example .env
```

### 4.2 Configurar variables de entorno (`.env`)

Edita el archivo `.env`:

```env
PORT=4000
FRONTEND_URL=http://localhost:5173
GRAPH_ENABLED=false
TIMEZONE=America/Mexico_City
AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=tu_secreto
AZURE_REDIRECT_URI=http://localhost:5173/
ROOM_EMAILS=sala.tokio@contoso.com,sala.berlin@contoso.com
```

Significado de variables:

- `GRAPH_ENABLED=false`: usa datos mock (útil para pruebas sin Graph).
- `GRAPH_ENABLED=true`: habilita autenticación OAuth y lectura real desde Graph.
- `ROOM_EMAILS`: lista separada por comas para filtrar salas específicas.

### 4.3 Instalar dependencias

```bash
npm install
```

### 4.4 Ejecutar aplicación en desarrollo

```bash
npm run dev
```

Servicios esperados:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

### 4.5 Validación rápida

- Abrir `http://localhost:5173`.
- Verificar lista de salas.
- Cambiar sala en el selector.
- Confirmar que calendario y estadísticas se actualicen.
- Editar aviso desde panel de administración y guardar.

Si `GRAPH_ENABLED=true`:

- Pulsar **Conectar Microsoft 365**.
- Completar login de Microsoft.
- Confirmar carga de salas/eventos reales.

---

## 5) Despliegue completo en servidor Linux con Apache

Esta sección describe el proceso de punta a punta sin omitir pasos.

### 5.1 Instalar dependencias del sistema

```bash
sudo apt update
sudo apt install -y apache2 nodejs npm rsync
sudo a2enmod proxy proxy_http rewrite headers ssl
```

### 5.2 Crear estructura de directorios en servidor

```bash
sudo mkdir -p /opt/salasjuntas
sudo mkdir -p /var/www/salasjuntas/current
sudo chown -R $USER:$USER /opt/salasjuntas
```

### 5.3 Copiar código fuente al servidor

Opción A (git):

```bash
cd /opt
git clone <URL_DEL_REPO> salasjuntas
cd salasjuntas
```

Opción B (artefacto/zip):

- Copiar el proyecto a `/opt/salasjuntas`.

### 5.4 Crear y configurar `.env` de producción

```bash
cd /opt/salasjuntas
cp .env.example .env
nano .env
```

Valores mínimos recomendados para producción:

```env
PORT=4000
FRONTEND_URL=https://TU_DOMINIO
GRAPH_ENABLED=true
TIMEZONE=America/Mexico_City
AZURE_TENANT_ID=<tenant_id>
AZURE_CLIENT_ID=<client_id>
AZURE_CLIENT_SECRET=<client_secret>
AZURE_REDIRECT_URI=https://TU_DOMINIO/
ROOM_EMAILS=sala1@tuempresa.com,sala2@tuempresa.com
```

### 5.5 Verificar integridad del repositorio (recomendado antes de instalar)

```bash
cd /opt/salasjuntas
node scripts/validate-repo.mjs
```

Si el script reporta conflictos (`<<<<<<<`, `=======`, `>>>>>>>`) o JSON inválido, corrige esos archivos antes de continuar.

### 5.6 Instalar dependencias Node y construir frontend

```bash
cd /opt/salasjuntas
npm install
npm run build -w frontend
```

Si aparece `npm ERR! EJSONPARSE` en `frontend/package.json`:

1. Abre el archivo y elimina cualquier marcador de conflicto de merge:
   - `<<<<<<< ...`
   - `=======`
   - `>>>>>>> ...`
2. Asegúrate de que el JSON sea válido (sin comentarios, claves con comillas dobles, sin comas extra).
3. Vuelve a ejecutar:

```bash
node scripts/validate-repo.mjs
npm install
```

### 5.7 Publicar frontend estático en Apache

```bash
sudo rsync -av --delete /opt/salasjuntas/frontend/dist/ /var/www/salasjuntas/current/
```

> El proyecto incluye `frontend/public/.htaccess` para resolver rutas SPA (fallback a `index.html`).

### 5.8 Configurar servicio systemd para backend

1. Copiar archivo base:

```bash
sudo cp /opt/salasjuntas/deploy/systemd/salasjuntas-api.service /etc/systemd/system/salasjuntas-api.service
```

2. (Opcional pero recomendado) revisar rutas en el service:

```bash
sudo nano /etc/systemd/system/salasjuntas-api.service
```

3. Recargar y activar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now salasjuntas-api
sudo systemctl status salasjuntas-api
```

4. Ver logs si hay error:

```bash
journalctl -u salasjuntas-api -f
```

### 5.9 Configurar VirtualHost Apache

1. Copiar archivo base:

```bash
sudo cp /opt/salasjuntas/deploy/apache/salasjuntas.conf /etc/apache2/sites-available/salasjuntas.conf
```

2. Editar dominio real:

```bash
sudo nano /etc/apache2/sites-available/salasjuntas.conf
```

Asegúrate de ajustar:

- `ServerName`
- `DocumentRoot` (si cambiaste ruta)
- `ProxyPass`/`ProxyPassReverse` a `http://127.0.0.1:4000/api`

3. Activar sitio y recargar:

```bash
sudo a2dissite 000-default.conf
sudo a2ensite salasjuntas.conf
sudo apachectl configtest
sudo systemctl reload apache2
```

### 5.10 (Recomendado) Configurar HTTPS con Let’s Encrypt

```bash
sudo apt install -y certbot python3-certbot-apache
sudo certbot --apache -d TU_DOMINIO
```

Luego valida renovación automática:

```bash
sudo certbot renew --dry-run
```

---

## 6) Lista de verificación post-instalación

1. `http://TU_DOMINIO` o `https://TU_DOMINIO` abre correctamente.
2. La UI muestra selector de salas.
3. Botón **Conectar Microsoft 365** funciona (si `GRAPH_ENABLED=true`).
4. Endpoints API responden detrás de Apache:
   - `GET https://TU_DOMINIO/api/health`
5. Estado de servicio API:
   - `systemctl status salasjuntas-api` en `active (running)`.
6. Logs de Apache sin errores críticos:
   - `/var/log/apache2/salasjuntas_error.log`

---

## 7) Comandos útiles de operación

Reiniciar backend:

```bash
sudo systemctl restart salasjuntas-api
```

Ver logs backend en tiempo real:

```bash
journalctl -u salasjuntas-api -f
```

Recargar Apache:

```bash
sudo systemctl reload apache2
```

Validar configuración Apache:

```bash
sudo apachectl configtest
```

---

## 8) Solución de problemas comunes

### Error 401 en `/api/rooms` o `/api/rooms/:id/events`

- Verifica que `GRAPH_ENABLED=true` implique autenticación previa.
- Inicia sesión desde botón **Conectar Microsoft 365**.
- Revisa si el token expiró (cerrar sesión y reconectar).

### Error de OAuth redirect_uri_mismatch

- `AZURE_REDIRECT_URI` en `.env` debe coincidir exactamente con el redirect URI de Azure.
- Revisar protocolo (`http/https`), dominio y slash final.

### Apache muestra 404 al refrescar rutas del frontend

- Confirma que `.htaccess` existe en `/var/www/salasjuntas/current/`.
- Confirma `AllowOverride All` en el bloque `<Directory>` del VirtualHost.
- Verifica que `mod_rewrite` esté habilitado.

### La API no inicia con systemd

- Revisa `journalctl -u salasjuntas-api -f`.
- Verifica ruta de Node en `ExecStart` (`which node`).
- Verifica que `/opt/salasjuntas/.env` exista y tenga formato válido.

---

## 9) Referencia rápida de endpoints

- `GET /api/health`
- `GET /api/auth/url`
- `POST /api/auth/exchange`
- `GET /api/rooms`
- `GET /api/rooms/:roomId/events?start=ISO&end=ISO`
- `GET /api/settings/notice`
- `PUT /api/settings/notice`
