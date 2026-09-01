#!/bin/bash

# Preencha com o usuário e IP do seu PC Linux que ficará no NOC
USUARIO_LINUX="dash-zabbix"
IP_LINUX="10.10.1.170"

echo "📦 Compilando o Dashboard..."
npm run build

echo "🚀 Enviando atualização para o NOC..."
# Usando SCP em vez de RSYNC
scp -r dist/* $USUARIO_LINUX@$IP_LINUX:/home/$USUARIO_LINUX/noc-vision/dist/

echo "✅ NOC Atualizado com sucesso!"