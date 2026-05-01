#!/bin/bash
# 🐉 Script de diagnóstico rápido para Lucoa-Bot-MD
# Uso: bash diagnose.sh

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  🐉 LUCOA-BOT-MD - DIAGNÓSTICO DE SESIÓN                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

SESSIONS_DIR="./Sessions/Owner"

# Verificar si existe sesión
if [ ! -d "$SESSIONS_DIR" ]; then
    echo "❌ No se encontró carpeta de sesión: $SESSIONS_DIR"
    echo "   La sesión será creada en el próximo inicio del bot."
    exit 0
fi

# Estado de creds.json
echo "📋 ESTADO DE CREDENCIALES:"
if [ -f "$SESSIONS_DIR/creds.json" ]; then
    echo "   ✅ creds.json: EXISTE"
    
    # Intentar parsear JSON (verificar si está corrupto)
    if python3 -m json.tool "$SESSIONS_DIR/creds.json" > /dev/null 2>&1; then
        echo "   ✅ creds.json: VÁLIDO (JSON correcto)"
        
        # Verificar campos críticos
        echo ""
        echo "   Campos criptográficos:"
        python3 << 'EOF'
import json

with open('./Sessions/Owner/creds.json', 'r') as f:
    creds = json.load(f)

checks = {
    'me': ('Identidad del usuario', bool(creds.get('me'))),
    'noiseKey': ('Clave Noise', bool(creds.get('noiseKey'))),
    'signedIdentityKey': ('Clave de identidad firmada', bool(creds.get('signedIdentityKey'))),
    'pairingEphemeralKeyPair': ('Clave de emparejamiento', bool(creds.get('pairingEphemeralKeyPair'))),
    'signedPreKey': ('Clave pre-firmada', bool(creds.get('signedPreKey'))),
    'registrationId': ('ID de registro', bool(creds.get('registrationId'))),
    'advSecretKey': ('Clave secreta', bool(creds.get('advSecretKey'))),
}

missing = []
for key, (desc, exists) in checks.items():
    icon = "✓" if exists else "✗"
    print(f"      {icon} {key.ljust(25)} - {desc}")
    if not exists:
        missing.append(key)

if missing:
    print(f"\n   ⚠️  CAMPOS FALTANTES: {', '.join(missing)}")
    print("      → Sesión podría estar CORRUPTA")
    print("      → Solución: Escanea un nuevo QR al iniciar el bot")
else:
    print("\n   ✅ TODOS LOS CAMPOS PRESENTES")

# Info de la cuenta
me = creds.get('me', {})
if me:
    print(f"\n   📱 Cuenta: {me.get('name', 'Sin nombre')}")
    print(f"   ID: {me.get('id', 'N/A')[:40]}...")

# Pre-keys
nextPreKeyId = creds.get('nextPreKeyId', 0)
print(f"\n   🔑 nextPreKeyId: {nextPreKeyId}")
if nextPreKeyId > 100:
    print(f"      ⚠️  nextPreKeyId ALTO - Esto es normal")
elif nextPreKeyId < 5:
    print(f"      ⚠️  nextPreKeyId MUY BAJO - Podría causar 401 en breve")
EOF
    else
        echo "   ❌ creds.json: CORRUPTO (JSON inválido)"
        echo "   ⚠️  Solución: El bot regenerará la sesión en el próximo inicio"
    fi
else
    echo "   ❌ creds.json: NO EXISTE"
    echo "   → Sesión nueva (requiere QR/código al iniciar)"
fi

# Contar pre-keys locales
echo ""
echo "🗝️  PRE-KEYS LOCALES:"
PREKEY_COUNT=$(find "$SESSIONS_DIR" -name "pre-key-*" 2>/dev/null | wc -l)
echo "   Total: $PREKEY_COUNT pre-keys"
if [ "$PREKEY_COUNT" -lt 20 ]; then
    echo "   ⚠️  BAJO: Se recomienda tener 20+ pre-keys"
    echo "      → El bot recargará automáticamente al conectar"
elif [ "$PREKEY_COUNT" -gt 500 ]; then
    echo "   ⚠️  ALTO: Considerablemente alto, pero seguro (no será purgado)"
else
    echo "   ✅ Rango óptimo"
fi

# Backup
echo ""
echo "💾 BACKUP DE SESIÓN:"
if [ -f "$SESSIONS_DIR/creds.backup.json" ]; then
    BACKUP_DATE=$(ls -l "$SESSIONS_DIR/creds.backup.json" | awk '{print $6, $7, $8}')
    echo "   ✅ EXISTE: $BACKUP_DATE"
else
    echo "   ❌ NO EXISTE (se creará en el próximo inicio)"
fi

# Información de archivos
echo ""
echo "📂 ARCHIVOS DE SESIÓN:"
TOTAL_FILES=$(find "$SESSIONS_DIR" -type f 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$SESSIONS_DIR" 2>/dev/null | cut -f1)
echo "   Total de archivos: $TOTAL_FILES"
echo "   Tamaño total: $TOTAL_SIZE"

# Resumen final
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📌 RECOMENDACIONES:"
echo ""
if [ "$PREKEY_COUNT" -lt 10 ]; then
    echo "   🔴 CRÍTICO: Pre-keys muy bajos. Reinicia el bot ahora."
elif grep -q "501\|403\|405" "$SESSIONS_DIR/creds.json" 2>/dev/null; then
    echo "   🟡 ADVERTENCIA: Sesión puede requerir nueva vinculación."
else
    echo "   🟢 TODO OK: La sesión se ve estable."
fi

echo ""
echo "💡 TIPS:"
echo "   • Si ves 401 persistente: cierra WhatsApp Web en otros navegadores"
echo "   • Si ves JSON corrupto: el bot lo repairará automáticamente"
echo "   • Para debug detallado: CREDS_DEBUG=1 npm start"
echo ""
