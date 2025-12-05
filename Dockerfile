# 使用Nginx作为基础镜像
FROM nginx:alpine

# 设置维护者信息
LABEL maintainer="NFT Generator Team"
LABEL version="1.0"
LABEL description="Web-based NFT Avatar Generator"

# 将当前目录下的所有文件复制到Nginx的默认HTML目录
COPY . /usr/share/nginx/html

# 暴露80端口
EXPOSE 80

# 启动Nginx服务
CMD ["nginx", "-g", "daemon off;"]
