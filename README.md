# ✨ PasteServer

A 🌟 powerful and efficient server to upload and manage text or code snippets.  
**🌐 Demo**: [https://paste.exbil.net/](https://paste.exbil.net/)

---

## 🚀 Features

- 🔧 **Multiple Storage Options**: Supports `Redis`, `ArangoDB`, or simple file storage
- 🔐 **Encryption Support**: Optional AES-256-GCM encryption for stored documents
- ⚙️ **Configurable**: Fully customizable settings for rate limits, document size, and more
- 📡 **API Integration**: RESTful API to create, read, and delete documents
- 🛡️ **Rate Limiting**: Prevents abuse with adjustable rate limits
- 🔄 **Auto Update Support**: Easily keep the server up to date

---

## 🏁 Getting Started

### 1️⃣ Requirements

- 🖥️ [Node.js](http://www.nodejs.org/)
- Either:
  - 🐏 [Redis](http://www.redis.io/)
  - 🍃 [ArangoDB](http://www.arangodb.com/)
  - 🎯 [MySQL](https://www.mysql.com/)
  - 📁 Or use the optional file storage

---

### 2️⃣ Installation

Clone the repository and install dependencies:

```bash
# 🌀 Clone this repository
git clone https://github.com/efebagri/node-paste-server.git
cd pasteserver

# 📦 Install dependencies using npm
npm install
# OR use Yarn
yarn install
```

---

### 3️⃣ Configuration

Edit the `config.js` file to customize:

- 🖥️ **Server settings**: Port, document-storage type, etc.
- 💾 **Storage settings**: Choose between `file`, `Redis`, or `ArangoDB`
- 🔐 **Encryption settings**: Enable/disable document encryption
- 📊 **Rate Limits**: Adjust request limits to prevent abuse

---

### 4️⃣ Environment Variables

Configure these environment variables (optional):

```env
# 🔐 Encryption Settings
STORAGE_ENCRYPTION=true/false
STORAGE_ENCRYPTION_KEY=your-32-byte-hex-key  # Must be 64 hex characters (32 bytes)

# 📁 File Storage Path (if using file storage)
STORAGE_PATH=/path/to/storage
```

---

## ⚙️ Configuration Details

### 🔐 Encryption Section (New)

Configure document encryption:

- **enabled**: Set `STORAGE_ENCRYPTION=true` to enable encryption
- **key**: Set `STORAGE_ENCRYPTION_KEY` for encryption/decryption
  - Must be exactly 32 bytes (64 hex characters)
  - If not set, a random key will be generated (not recommended for production)

---

### 🗄️ Storage Section

Select your storage type and configure its settings:

- **type**: Choose `"file"`, `"redis"`, `"mysql"`, or `"arangodb"`
- **host**: Host URL for the storage
- **port**: Port for the storage
- 🔑 **password**: Password for the storage (if applicable)
- 👤 **user**: Username for ArangoDB authentication
- 🗃️ **database**: Database name (only for ArangoDB)
- ⏲️ **documentExpireInMs**: Expiry time for unused documents (only for Redis)
- 📂 **path**: Path to store documents (only for file storage)

[Previous sections about Rate Limiting, AutoUpdate, and API Usage remain the same]

---

### 🎯 MySQL-specific settings:
- 🏠 **host**: MySQL server host
- 🔌 **port**: MySQL server port (default: 3306)
- 👤 **user**: MySQL username
- 🔑 **password**: MySQL user password
- 🗄️ **database**: MySQL database name
- 📋 **table**: Table name for storing documents (will be created if it doesn't exist)


---

## 🆕 Recent Updates

- ✨ Added AES-256-GCM encryption support for stored documents
- 🔒 Implemented secure key management for encryption
- 🔄 Added backwards compatibility for encrypted documents
- 🛠️ Improved error handling and logging
- 📝 Enhanced documentation and configuration options

---

## 📋 Feature Overview

| Status | Feature | Description | Storage Types |
|:------:|---------|-------------|---------------|
| ✅ | Document Storage | Store and retrieve text/code snippets | 🗄️ All |
| ✅ | AES-256-GCM Encryption | Secure document encryption | 📁 File, 🎯 MySQL |
| ✅ | Rate Limiting | Prevent API abuse | 🗄️ All |
| ✅ | Auto-Delete | Automatic deletion of expired documents | 🐏 Redis |
| ✅ | Delete Keys | Secure document deletion with keys | 🗄️ All |
| ✅ | Auto Updates | Automatic server updates | 🗄️ All |
| ✅ | RESTful API | Full API support | 🗄️ All |
| ✅ | Custom Frontend | Customizable web interface | 🗄️ All |
| ✅ | Multiple Storage | Support for different storage backends | 🗄️ All |

## 🚀 Coming Soon

| Status | Feature | Description | Planned Version |
|:------:|---------|-------------|-----------------|
| 🔜 | Syntax Highlighting | Code highlighting in frontend | v2.1.0 |
| 🔜 | Document Sharing | Share documents with specific users | v2.2.0 |
| 🔜 | API Keys | Authentication for API access | v2.3.0 |
| 🔜 | MongoDB Support | MongoDB as storage backend | v2.4.0 |
| 🔜 | Password Protection | Password protected documents | v2.5.0 |
| 🔜 | Document Expiry | Set custom expiration times | v2.6.0 |
| 🔜 | Version History | Track document changes | v2.7.0 |
| 🔜 | Tags & Categories | Organize documents | v2.8.0 |
| 🔜 | Webhooks | Integration with other services | v2.9.0 |

### 📝 Legend

Storage Types:
- 📁 File Storage
- 🐏 Redis
- 🎯 MySQL
- 🍃 ArangoDB

Status:
- ✅ Available
- 🔜 Coming Soon

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).  
Feel free to use and modify as needed.

---

## 🙏 Credits

This project is based on the original [PasteServer](https://github.com/juliarn/PasteServer)
by [juliarn](https://github.com/juliarn).  
The current version involves enhancements and further development by new contributors.