# Guía de Distribución Flatpak y Publicación en Flathub (`app.affinite.Affinite`)

Este directorio contiene los manifiestos oficiales de **AppStream (`app.affinite.Affinite.metainfo.xml`)** y **Flathub (`app.affinite.Affinite.yml`)** para distribuir **AFFiNITe Desktop** en Linux tanto de forma directa (GitHub Releases) como en la tienda oficial de **Flathub**.

---

## 1. Distribución Inmediata vía GitHub Releases (`.flatpak` Bundle)

No necesitas esperar la revisión de Flathub para que cualquier usuario de Linux instale la aplicación con un solo comando.

### Generar el paquete `.flatpak` localmente
Desde la raíz del repositorio:

```bash
# Compila el frontend/Electron, empaqueta el ASAR (con binarios nativos desempacados),
# genera AFFiNITe-linux-x86_64.flatpak y lo instala en el sistema del usuario:
./build-flatpak.sh --rebuild

# Si solo deseas actualizar rápido el código o regenerar sin reinstalar:
./build-flatpak.sh stable --no-install
```

El script `run_release.sh` ya está configurado para construir y subir automáticamente:
- `AFFiNITe-linux-x86_64.AppImage`
- `AFFiNITe-linux-x86_64.flatpak`
- `AFFINITE-release.apk`

### Instalación por parte de usuarios finales
Cualquier usuario que descargue `AFFiNITe-linux-x86_64.flatpak` desde tu página de GitHub Releases puede instalarlo ejecutando:

```bash
flatpak --user install -y AFFiNITe-linux-x86_64.flatpak
flatpak run app.affinite.Affinite
```

---

## 2. Permiso de Puente con el Host para Antigravity (`agy` CLI)

El manifiesto Flatpak incluye el permiso:
```yaml
--talk-name=org.freedesktop.Flatpak
```
Esto permite que AFFiNITe invoque de manera transparente el binario `agy` (Google Antigravity CLI) instalado en tu sistema anfitrión (`~/.local/bin/agy`) mediante `flatpak-spawn --host` **sin requerir API Keys externas ni configurar servidores en la nube**.

Puedes verificar la conexión desde el contenedor Flatpak con:
```bash
flatpak run --command=sh app.affinite.Affinite -c 'flatpak-spawn --host ~/.local/bin/agy --version'
```

---

## 3. Cómo Publicar `app.affinite.Affinite` en la Tienda Oficial de Flathub

Para que AFFiNITe aparezca en **Flathub.org**, GNOME Software y KDE Discover para todos los usuarios de Linux:

### Paso 1: Validar el archivo AppStream Metainfo
Verifica que el archivo `metainfo.xml` cumpla el estándar de Freedesktop:

```bash
appstreamcli validate --no-net flathub/app.affinite.Affinite.metainfo.xml
```

### Paso 2: Preparar el tarball en GitHub Releases
1. Cuando publiques una versión en GitHub Releases (ej. `v0.28.0`), comprime el directorio `packages/frontend/apps/electron/out/stable/AFFiNITe-stable-linux-x64`:
   ```bash
   tar -czf AFFiNITe-linux-x64-0.28.0.tar.gz -C packages/frontend/apps/electron/out/stable AFFiNITe-stable-linux-x64
   sha256sum AFFiNITe-linux-x64-0.28.0.tar.gz
   ```
2. Sube `AFFiNITe-linux-x64-0.28.0.tar.gz` a la release `v0.28.0` en GitHub.
3. Reemplaza `REPLACE_WITH_RELEASE_TARBALL_SHA256` en `flathub/app.affinite.Affinite.yml` con el hash SHA-256 obtenido.

### Paso 3: Enviar el Pull Request al repositorio de Flathub
1. Haz un **Fork** del repositorio oficial de Flathub en GitHub:  
   👉 [https://github.com/flathub/flathub](https://github.com/flathub/flathub)
2. Clona tu fork cambiando a la rama obligatoria **`new-pr`**:
   ```bash
   git clone --branch=new-pr git@github.com:TU_USUARIO/flathub.git
   cd flathub
   git checkout -b app.affinite.Affinite new-pr
   ```
3. Copia los archivos de este directorio (`flathub/app.affinite.Affinite.yml` y `flathub/app.affinite.Affinite.metainfo.xml`, junto con el ícono `icon_stable_512x512.png`) en la raíz del repositorio clonado.
4. Haz commit y push de tu rama:
   ```bash
   git add app.affinite.Affinite.yml app.affinite.Affinite.metainfo.xml icon_stable_512x512.png
   git commit -m "Add app.affinite.Affinite"
   git push origin app.affinite.Affinite
   ```
5. Abre un **Pull Request** contra `flathub/flathub` apuntando a la rama base **`new-pr`**.
6. El bot oficial `flathubbot` compilará automáticamente el paquete en los servidores de Flathub (`bot, build`). Una vez aprobado por los revisores, Flathub creará el repositorio oficial `github.com/flathub/app.affinite.Affinite`.
