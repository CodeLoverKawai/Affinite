#!/bin/bash

# Asegura que el script se ejecute desde la raíz del proyecto
cd "$(dirname "$0")"

# Ejecuta el script de release con Dart
dart release.dart
