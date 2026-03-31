# CI/CD 部署配置指南

## 概述

本项目使用 GitHub Actions + Self-hosted Runner (Docker) 实现 CI/CD：

| 工作流                  | 触发条件            | 运行环境             | 作用                     |
| ----------------------- | ------------------- | -------------------- | ------------------------ |
| `ci.yml`                | Push/PR 到 dev/main | GitHub 托管          | 代码检查、测试、构建验证 |
| `deploy-staging.yml`    | Push 到 dev         | Self-hosted (Docker) | 部署到 Staging           |
| `deploy-production.yml` | Push 到 release     | Self-hosted (Docker) | 部署到 Production        |

---


## Docker Compose 方式（可选）

创建 `docker-compose.yml`：

```yaml
version: "3.8"

services:
  github-runner:
    build: .
    container_name: github-runner
    restart: always
    environment:
      - GITHUB_URL=https://github.com/feiyujie1986-code/academic-web
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - RUNNER_NAME=docker-runner
      - RUNNER_LABELS=self-hosted
    volumes:
      # 挂载部署目录（根据实际路径修改）
      - /www/wwwroot/lms7799:/www/wwwroot/lms7799
      # 如果需要多个部署目录
      # - /var/www/light-web:/var/www/light-web
```

启动：

```bash
# 设置 Token 环境变量
export GITHUB_TOKEN="YOUR_TOKEN"

# 启动
docker-compose up -d

# 查看日志
docker-compose logs -f
```

---

## 修改部署路径

在工作流文件中修改 `DEPLOY_PATH` 环境变量：

**deploy-staging.yml:**

```yaml
env:
  DEPLOY_PATH: /www/wwwroot/lms7799 # 当前配置
```

**deploy-production.yml:**

```yaml
env:
  DEPLOY_PATH: /var/www/light-web # 修改为实际路径
```

**注意：** Docker 容器内的路径必须与挂载路径一致！

---

## 原生安装方式（备选）

如果不使用 Docker，可以直接在服务器上安装 Runner。

### 1. 下载并配置 Runner

```bash
# 创建 runner 目录
mkdir -p ~/actions-runner && cd ~/actions-runner

# 下载最新 runner（版本号请从 GitHub 页面获取）
curl -o actions-runner-linux-x64-2.321.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-x64-2.321.0.tar.gz

# 解压
tar xzf ./actions-runner-linux-x64-2.321.0.tar.gz

# 配置 runner（TOKEN 从 GitHub 页面获取）
./config.sh --url https://github.com/feiyujie1986-code/academic-web --token YOUR_TOKEN

# 安装为系统服务（推荐）
sudo ./svc.sh install
sudo ./svc.sh start
```

### 2. 安装依赖

```bash
# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 pnpm
sudo npm install -g pnpm

# 安装 rsync
sudo apt-get install -y rsync
```

---

## Nginx 配置示例

### 基础配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /www/wwwroot/lms7799;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # 静态资源缓存
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Vue Router History 模式支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理（根据实际后端地址修改）
    location /api/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 使用流程

### 日常开发

1. 在 `dev` 分支开发新功能
2. Push 代码后自动运行 CI 检查
3. CI 通过后自动部署到 Staging 环境

### 发布上线

1. 创建 PR: `dev` → `main`
2. Code Review 并合并
3. 合并后自动部署到 Production 环境

---

## 故障排查

### Docker Runner 问题

```bash
# 查看容器状态
docker ps -a | grep github-runner

# 查看容器日志
docker logs -f github-runner

# 重启容器
docker restart github-runner

# 重新创建容器（Token 过期时）
docker rm -f github-runner
# 获取新 Token 后重新运行 docker run 命令
```

### 部署失败

1. 检查挂载目录是否正确：`docker inspect github-runner | grep Mounts -A 20`
2. 检查目录权限：`ls -la /www/wwwroot/`
3. 手动进入容器测试：`docker exec -it github-runner bash`

### CI 失败

1. 查看 GitHub Actions 日志
2. 常见问题：
   - ESLint 错误：运行 `pnpm lint` 本地修复
   - 类型错误：运行 `pnpm vue-tsc --noEmit` 检查
   - 测试失败：运行 `pnpm test` 本地调试

---

## 可选：Production 环境保护

在 GitHub 仓库设置中配置环境保护规则：

1. `Settings` → `Environments` → `New environment`
2. 创建 `production` 环境
3. 配置保护规则：
   - Required reviewers（需要审批人）
   - Wait timer（等待时间）

这样 Production 部署需要人工审批后才能执行。
