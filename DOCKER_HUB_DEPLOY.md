# 将 NFT 生成器发布到 Docker 镜像仓库

本文将指导您如何将 NFT 生成器的 Docker 镜像发布到 Docker Hub 或其他 Docker 镜像仓库。

## 前提条件

1. 已安装 Docker
2. 已注册 Docker Hub 账号（或其他镜像仓库账号）
3. 已在本地构建了 NFT 生成器的 Docker 镜像

## 步骤 1：登录 Docker Hub

在终端中执行以下命令登录 Docker Hub：

```bash
docker login
```

根据提示输入您的 Docker Hub 用户名和密码。

如果您使用其他镜像仓库（如阿里云、腾讯云等），需要指定仓库地址：

```bash
docker login <registry-url>
```

## 步骤 2：为镜像打标签

使用 `docker tag` 命令为您的镜像打标签，格式为：

```bash
docker tag <local-image-name>:<tag> <docker-hub-username>/<repository-name>:<tag>
```

示例：

```bash
# 为本地镜像打标签
docker tag nft-generator:latest hahhh11/nft-generator:latest

# 也可以添加版本号
docker tag nft-generator:latest hahhh11/nft-generator:1.0.0
```

## 步骤 3：推送镜像到 Docker Hub

使用 `docker push` 命令推送镜像到 Docker Hub：

```bash
docker push <docker-hub-username>/<repository-name>:<tag>
```

示例：

```bash
# 推送 latest 标签
docker push hahhh11/nft-generator:latest

# 推送版本标签
docker push hahhh11/nft-generator:1.0.0
```

## 步骤 4：验证推送结果

登录到 Docker Hub 网站，查看您的镜像是否成功发布。

## 完整示例流程

```bash
# 1. 构建本地镜像
docker build -t nft-generator .

# 2. 登录 Docker Hub
docker login

# 3. 为镜像打标签
docker tag nft-generator:latest hahhh11/nft-generator:latest
docker tag nft-generator:latest hahhh11/nft-generator:1.0.0

# 4. 推送镜像
docker push hahhh11/nft-generator:latest
docker push hahhh11/nft-generator:1.0.0
```

## 从 Docker Hub 拉取和使用镜像

其他用户可以通过以下命令拉取和使用您发布的镜像：

```bash
# 拉取镜像
docker pull hahhh11/nft-generator:latest

# 运行容器
docker run -d -p 6877:80 --name nft-generator hahhh11/nft-generator:latest
```

## 使用 GitHub Actions 自动化构建和推送

您可以使用 GitHub Actions 实现代码提交后自动构建和推送 Docker 镜像。创建 `.github/workflows/docker-build.yml` 文件：

```yaml
name: Docker Build and Push

on:
  push:
    branches: [ main ]
    tags: [ 'v*.*.*' ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_HUB_USERNAME }}
          password: ${{ secrets.DOCKER_HUB_ACCESS_TOKEN }}
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            hahhh11/nft-generator:latest
            hahhh11/nft-generator:${{ github.sha }}
```

## 镜像仓库最佳实践

1. **使用语义化版本号**：如 `1.0.0`、`1.1.0`、`2.0.0`
2. **保持 latest 标签**：指向最新稳定版本
3. **添加描述**：在 Docker Hub 上为仓库添加详细描述
4. **添加徽章**：在 README.md 中添加 Docker Hub 徽章
5. **使用多阶段构建**：减小镜像大小
6. **定期更新基础镜像**：保持安全性

## 常见问题

### Q: 推送镜像时遇到权限问题
A: 确保您的 Docker Hub 账号有推送权限，或者使用访问令牌替代密码登录。

### Q: 推送镜像速度慢
A: 可以尝试使用国内镜像加速服务，或者检查网络连接。

### Q: 如何删除已发布的镜像
A: 在 Docker Hub 网站上找到对应的镜像版本，点击删除按钮。

## 参考链接

- [Docker Hub 官方文档](https://docs.docker.com/docker-hub/)
- [Docker 镜像标签最佳实践](https://docs.docker.com/engine/reference/commandline/tag/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
