# SiA — Sistema de Acupuntura e Iridologia

Aplicação moderna para gestão clínica de Acupuntura (MTC, Auricular, YNSA, Koryo, Ventosas, Alimentação Energética, Ryodoraku e Estética), Iridologia (Queixas, Jensen, RayId e Padrões) e Florais.

## Recursos Principais

- **Segurança & LGPD:** Acesso protegido por **PIN / Senha** com criptografia **AES-256-GCM** e derivação de chave **scrypt** para dados pessoais e prontuários no SQLite.
- **Agenda, Pacientes & Financeiro:** Calendário diário, cadastro de pacientes, controle de florais, calculadora financeira e confirmação via **WhatsApp** (`wa.me`).
- **MTC & Iridologia Interativa:** Visualização de pontos sobre mapas anatômicos com coordenadas e sobreposição interativa de mapa iridológico (zoom, posição e opacidade).
- **Prontuário & Exportação:** Histórico completo, player de áudio terapêutico e geração de ficha/recibo em **PDF**.
- **Backup com 1 clique:** Exportação segura do banco SQLite.

## Como Executar Localmente

1. Instale as dependências:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```
2. Inicie o backend e o frontend (ou execute `Iniciar_Sistema.bat` no Windows):
   ```bash
   # Terminal 1 (Backend - porta 3001)
   cd server && npm run dev

   # Terminal 2 (Frontend - porta 5173)
   cd client && npm run dev
   ```
3. Acesse `http://localhost:5173` no navegador e crie seu PIN inicial.
