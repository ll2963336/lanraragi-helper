# LANraragi Helper

一个用于增强 LANraragi 使用体验的浏览器扩展，支持快速检索、状态同步和内容管理。

## 简述

LANraragi Helper 是一个专门为 LANraragi 设计的浏览器扩展，它可以帮助用户在浏览 E-hentai/Exhentai 时快速识别已收藏的内容，并提供便捷的内容管理功能。

## 主要功能

### 1. 服务器连接管理
- 支持服务器地址、端口配置
- Token 认证机制
- 实时连接状态监控
- 定时检查服务器状态

### 2. 内容检索与标记
- 自动检测页面内容
- 多级匹配策略：
  - 精确链接匹配
  - 完整标题匹配
  - 清理后的标题匹配
- 可视化标记系统：
  - ✅ 完全匹配
  - ⚠️ 部分匹配
  - ❌ 未匹配

### 3. 便捷操作
- 一键复制链接
- 一键复制标题
- 快速查看匹配结果
- 状态实时同步

## 使用方法

1. 安装扩展
2. 配置 LANraragi 服务器信息：
   - 服务器地址
   - 端口号
   - API Token
3. 点击 Check 按钮测试连接
4. 浏览 E-hentai/Exhentai，扩展会自动标记内容状态

## 开发环境

- IDE: [Trae](https://www.trae.ai/) - 智能代码编辑器

## 技术栈

- [WXT](https://github.com/wxt-dev/wxt) - 现代化的浏览器扩展开发框架
- [React](https://github.com/facebook/react) - 用户界面构建库
- [shadcn/ui](https://github.com/shadcn-ui/ui) - 可重用的组件库
