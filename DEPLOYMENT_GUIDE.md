# 🚀 AI画堂 - 腾讯云服务器保姆级部署指南

---

## 📍 服务器信息
```
腾讯云控制台: https://console.cloud.tencent.com/lighthouse/instance/detail?searchParams=rid%3D5&rid=5&id=lhins-13nqd0bx
宝塔面板: http://43.129.250.141:8888/tencentcloud
宝塔账号: d421ae86
宝塔密码: 87c90ee4b053
服务器IP: 43.129.250.141
GitHub仓库: https://github.com/haoy0600-ctrl/aihuatang.git
域名: aihuatang.top
```

---

## 📋 准备工作

### 第一步：登录腾讯云控制台

1. 打开浏览器，访问：
   ```
   https://console.cloud.tencent.com/lighthouse/instance/detail?searchParams=rid%3D5&rid=5&id=lhins-13nqd0bx
   ```

2. 如果需要登录，使用你的腾讯云账号密码登录

3. 登录后，你会看到服务器详情页面

### 第二步：登录宝塔面板

**方法一：通过腾讯云控制台登录（推荐新手）**

1. 在腾讯云控制台的服务器详情页面，找到「登录」按钮
2. 点击登录后，会进入服务器的 WebShell
3. 在 WebShell 中，输入宝塔面板地址：
   ```
   http://43.129.250.141:8888/tencentcloud
   ```
   （注意：这是在浏览器中打开，不是在 WebShell 中输入）

**方法二：直接在浏览器打开宝塔面板**

1. 打开一个新的浏览器标签页
2. 输入地址：
   ```
   http://43.129.250.141:8888/tencentcloud
   ```
3. 输入账号：`d421ae86`
4. 输入密码：`87c90ee4b053`
5. 点击登录

### 第三步：确认 Nginx 是否已安装

1. 登录宝塔面板后，点击左侧菜单的「软件商店」
2. 在搜索框输入「Nginx」
3. 如果显示「已安装」，则跳过这一步
4. 如果显示「安装」，点击安装，等待安装完成

---

## 🔧 第一步：创建 4GB Swap 虚拟内存（必做！）

### 操作步骤：

1. 在宝塔面板左侧菜单，找到「终端」并点击
2. 会弹出一个黑色的终端窗口
3. 复制以下命令，**一次性粘贴到终端中**：

```bash
dd if=/dev/zero of=/swapfile bs=1M count=4096
```

4. 按回车键执行，等待大约 1-2 分钟
5. 执行完成后，继续复制粘贴以下命令：

```bash
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap defaults 0 0' >> /etc/fstab
free -h
```

6. 按回车键执行

### 验证结果：

执行完成后，终端会显示类似这样的信息：
```
              total        used        free      shared  buff/cache   available
Mem:           1.9Gi       1.1Gi       145Mi        12Mi       728Mi       644Mi
Swap:          4.0Gi          0B       4.0Gi  # ✅ 看到这行就成功了！
```

---

## 🔧 第二步：安装 Node.js 环境

### 方法一：宝塔面板安装（推荐新手）

1. 登录宝塔面板
2. 点击左侧菜单的「软件商店」
3. 在搜索框输入「Node.js」
4. 找到 Node.js 20.x LTS 版本（图标是绿色的）
5. 点击「安装」按钮
6. 等待安装完成（大约 5-10 分钟）
7. 安装完成后，点击「设置」可以查看版本信息

### 方法二：终端命令安装（备用）

1. 打开宝塔面板的「终端」
2. 复制粘贴以下命令：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs build-essential
```

3. 按回车键执行，等待安装完成
4. 安装完成后，验证版本：

```bash
node -v
npm -v
```

### 验证结果：

终端显示：
```
v20.x.x    # Node.js 版本
10.x.x     # npm 版本
```

---

## 🔧 第三步：部署项目代码

### 操作步骤：

1. 打开宝塔面板的「终端」
2. 复制粘贴以下命令，**一条一条执行**：

**命令1：创建网站目录**
```bash
mkdir -p /www/wwwroot/aihuatang
```
按回车执行

**命令2：进入网站目录**
```bash
cd /www/wwwroot/aihuatang
```
按回车执行

**命令3：克隆 GitHub 项目**
```bash
git clone https://github.com/haoy0600-ctrl/aihuatang.git .
```
按回车执行，等待下载完成

**命令4：安装依赖**
```bash
npm install
```
按回车执行，等待安装完成（大约 5-10 分钟）

**命令5：构建项目**
```bash
npm run build
```
按回车执行，等待构建完成（大约 3-5 分钟）

### 如果构建失败：

如果终端显示红色错误信息，执行以下命令清理后重试：

```bash
rm -rf node_modules .next package-lock.json
npm install
npm run build
```

---

## 🔧 第四步：配置 PM2 进程管理器

### 操作步骤：

1. 打开宝塔面板的「终端」
2. 复制粘贴以下命令，**一条一条执行**：

**命令1：安装 PM2**
```bash
npm install -g pm2
```
按回车执行

**命令2：创建启动配置文件**
```bash
cat > /www/wwwroot/aihuatang/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aihuatang',
    script: 'npm',
    args: 'run start',
    cwd: '/www/wwwroot/aihuatang',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF
```
按回车执行

**命令3：启动项目**
```bash
pm2 start ecosystem.config.js
```
按回车执行

**命令4：设置开机自启**
```bash
pm2 startup
```
按回车执行，会提示你执行一条命令，复制那条命令并执行

**命令5：保存配置**
```bash
pm2 save
```
按回车执行

**命令6：验证状态**
```bash
pm2 status
```
按回车执行

### 验证结果：

终端显示类似这样的信息：
```
┌────┬────────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┐
│ id │ name                   │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │
├────┼────────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┤
│ 0  │ aihuatang              │ default     │ N/A     │ fork    │ 12345    │ 0s     │ 0    │ online    │ 0%       │ 50MB     │ root     │
└────┴────────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┘
# ✅ status 显示 online 就成功了！
```

---

## 🔧 第五步：配置环境变量

### 操作步骤：

1. 在宝塔面板左侧菜单，点击「文件」
2. 在文件管理器中，找到 `/www/wwwroot/aihuatang` 目录
3. 点击右上角的「新建文件」
4. 文件名输入：`.env.local`
5. 文件内容输入以下内容（注意替换为你的真实值）：

```bash
# Supabase 配置（请替换为你的真实值）
NEXT_PUBLIC_SUPABASE_URL=https://你的supabase项目ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=你的supabase_service_role_key

# API 密钥（请替换为你的真实值）
GRSAI_API_KEY=你的GrsAI_API_Key
DEEPSEEK_API_KEY=你的DeepSeek_API_Key

# NextAuth 配置
NEXTAUTH_SECRET=请生成一个32位随机密钥
NEXTAUTH_URL=https://aihuatang.top

# 端口配置
PORT=3000
```

6. 点击「保存」

### 生成随机密钥：

1. 打开宝塔面板的「终端」
2. 执行以下命令：
```bash
openssl rand -hex 32
```
3. 复制输出的字符串，粘贴到 `.env.local` 文件中的 `NEXTAUTH_SECRET=` 后面

---

## 🔧 第六步：配置 Nginx 反向代理

### 第一步：添加网站

1. 在宝塔面板左侧菜单，点击「网站」
2. 点击右上角的「添加站点」
3. 填写以下信息：

| 项目 | 值 |
|------|-----|
| 域名 | aihuatang.top |
| 根目录 | /www/wwwroot/aihuatang/.next |
| PHP版本 | 纯静态（不选任何PHP版本） |

4. 点击「提交」

### 第二步：配置反向代理

1. 在网站列表中，找到刚才添加的 `aihuatang.top`
2. 点击右侧的「设置」
3. 在设置页面，点击左侧的「反向代理」
4. 点击「添加反向代理」
5. 填写以下信息：

| 项目 | 值 |
|------|-----|
| 代理名称 | aihuatang |
| 目标URL | http://127.0.0.1:3000 |
| 发送域名 | aihuatang.top |

6. 点击「提交」

### 第三步：修改 Nginx 配置（关键步骤！）

1. 在网站设置页面，点击左侧的「配置文件」
2. 全选原有内容（Ctrl+A）
3. 删除原有内容
4. 粘贴以下内容：

```nginx
server {
    listen 80;
    server_name aihuatang.top www.aihuatang.top;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name aihuatang.top www.aihuatang.top;

    ssl_certificate /www/server/panel/vhost/cert/aihuatang.top/fullchain.pem;
    ssl_certificate_key /www/server/panel/vhost/cert/aihuatang.top/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE:ECDH:AES:HIGH:!NULL:!aNULL:!MD5:!ADH:!RC4;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        proxy_pass http://127.0.0.1:3000;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript application/x-font-ttf image/svg+xml;
    gzip_comp_level 6;
}
```

5. 点击「保存」
6. 弹出提示后，点击「重启 Nginx」

---

## 🔧 第七步：申请 SSL 证书

### 操作步骤：

1. 在网站设置页面，点击左侧的「SSL」
2. 在证书类型中，选择「Let's Encrypt」
3. 勾选「aihuatang.top」和「www.aihuatang.top」
4. 开启「自动续签」
5. 点击「申请」
6. 等待证书签发完成（大约 1-2 分钟）

### 如果申请失败：

可能是域名还没有解析到服务器 IP。请先完成域名解析：

1. 登录你的域名注册商
2. 添加 A 记录：
   - 主机记录：`@`
   - 记录类型：`A`
   - 记录值：`43.129.250.141`
   - TTL：默认值

3. 添加 A 记录：
   - 主机记录：`www`
   - 记录类型：`A`
   - 记录值：`43.129.250.141`
   - TTL：默认值

4. 等待 DNS 解析生效（通常需要 5-30 分钟）
5. 再次尝试申请 SSL 证书

---

## 🔧 第八步：配置 GitHub Webhook 自动部署

### 第一步：创建自动部署脚本

1. 打开宝塔面板的「终端」
2. 复制粘贴以下命令：

```bash
cat > /www/wwwroot/aihuatang/deploy.sh << 'EOF'
#!/bin/bash

cd /www/wwwroot/aihuatang

echo "🚀 开始部署..."

# 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 安装新依赖
echo "📦 安装依赖..."
npm install

# 构建项目
echo "🔨 构建项目..."
npm run build

# 重启 PM2
echo "🔄 重启服务..."
pm2 restart aihuatang

echo "✅ 部署完成！"
EOF

chmod +x /www/wwwroot/aihuatang/deploy.sh
```

3. 按回车键执行

### 第二步：配置 GitHub Webhook

1. 打开浏览器，访问：https://github.com/haoy0600-ctrl/aihuatang
2. 点击页面上方的「Settings」
3. 在左侧菜单，点击「Webhooks」
4. 点击右上角的「Add webhook」
5. 填写以下信息：

| 项目 | 值 |
|------|-----|
| Payload URL | https://aihuatang.top/api/deploy |
| Content type | application/json |
| Secret | 输入一个复杂密码（建议用字母+数字+符号） |
| Events | 选择「Just the push event」 |
| Active | 勾选 |

6. 点击「Add webhook」

---

## 🔧 第九步：防火墙配置

### 操作步骤：

1. 在宝塔面板左侧菜单，点击「安全」
2. 找到「防火墙」选项
3. 确保以下端口已放行：

| 端口 | 用途 |
|------|------|
| 80 | HTTP 访问 |
| 443 | HTTPS 访问 |
| 3000 | Next.js 服务 |
| 8888 | 宝塔面板 |

4. 如果没有放行，点击「添加规则」添加

---

## ✅ 验证部署

### 第一步：检查服务状态

1. 打开宝塔面板的「终端」
2. 执行以下命令：

```bash
pm2 status
```

显示 `online` 状态即为成功

### 第二步：检查端口监听

```bash
netstat -tlnp | grep 3000
```

显示端口 3000 正在监听即为成功

### 第三步：检查 Nginx 配置

```bash
nginx -t
```

显示 `ok` 即为成功

### 第四步：访问网站

1. 打开浏览器
2. 访问：`https://aihuatang.top`
3. 如果能看到网站首页，说明部署成功！

### 第五步：测试功能

- ✅ 首页正常显示
- ✅ 登录功能正常
- ✅ 卡密兑换页面有「红框合规禁令」和「一键复制微信」
- ✅ 生图功能正常

---

## 📋 常用运维命令

### PM2 管理命令：
```bash
pm2 status          # 查看服务状态
pm2 logs aihuatang  # 查看日志
pm2 restart aihuatang  # 重启服务
pm2 stop aihuatang     # 停止服务
```

### 手动部署命令：
```bash
cd /www/wwwroot/aihuatang && git pull && npm install && npm run build && pm2 restart aihuatang
```

### 查看日志：
```bash
pm2 logs aihuatang --lines 100  # 查看最近100行日志
```

### 查看系统资源：
```bash
free -h             # 查看内存使用
df -h               # 查看磁盘空间
top                 # 查看 CPU 使用
```

---

## ❓ 常见问题排查

### Q1: 网站无法访问？
1. 检查 Nginx 配置：`nginx -t`
2. 检查 PM2 状态：`pm2 status`
3. 检查防火墙端口是否放行
4. 检查域名是否解析到服务器 IP

### Q2: 生图失败？
1. 检查环境变量配置是否正确
2. 查看日志：`pm2 logs aihuatang`
3. 检查 API 密钥是否正确

### Q3: 卡密兑换失败？
1. 查看日志：`pm2 logs aihuatang`
2. 检查数据库连接是否正常
3. 检查卡密格式是否正确

### Q4: 内存不足导致构建失败？
1. 检查 Swap 是否生效：`free -h`
2. 如果没有 Swap，重新执行第一步创建 Swap

---

## 🎉 部署成功！

现在你的 AI 画堂网站已经部署完成！

**访问地址：** https://aihuatang.top

**功能清单：**
- ✅ AI 生图（文生图 / 图生图）
- ✅ 卡密兑换（防撞库 + 容错 + 自证回显）
- ✅ 一键复制微信客服（YH509235）
- ✅ 红框高亮合规禁令
- ✅ GitHub Webhook 自动部署
- ✅ 生图失败自动退分

**下次更新代码只需：**
1. 在本地修改代码
2. `git push` 推送到 GitHub
3. 服务器自动拉取、构建、重启

---

如有任何问题，请随时联系！
