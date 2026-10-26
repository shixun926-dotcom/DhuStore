# DhuStore 东华购物 · 项目介绍

> 一个前后端分离的一站式购物商城，支持**用户购物**、**用户申请发布商品**、**管理员审核与运营**，并接入**阿里云 OSS 多图上传**。

---

## 一、项目概览

| 项目 | 说明 |
|---|---|
| 项目名称 | DhuStore（东华购物） |
| 项目类型 | B2C 商城 + 用户发布（C2C）扩展 |
| 架构模式 | 前后端分离（RESTful API + 静态前端） |
| 后端 | Spring Boot 4.1.1 / Java 17 |
| 前端 | Vue 3（CDN 引入，原生 JS 模块）+ 原生 SVG 图表 |
| 数据库 | MySQL 8 |
| 图片存储 | 阿里云 OSS（可回退本地磁盘） |
| 鉴权 | JWT 无状态鉴权 + 角色（普通用户 / 管理员） |

### 角色与能力

| 角色 | 能力 |
|---|---|
| 游客 | 浏览分类与商品、搜索、查看商品详情 |
| 普通用户 | 注册登录、购物车、收货地址、下单支付、订单流转、申请发布商品、查看审核结果 |
| 管理员 | 数据看板、商品管理、订单管理与发货、商品发布申请审核 |

---

## 二、核心功能

### 2.1 商城购物

- **首页**：轮播、分类入口、限时秒杀、商品推荐
- **商品**：分类筛选、关键词搜索（含搜索联想）、分页列表、详情多图浏览
- **购物车**：加购、改数量、勾选/全选、删除、批量删除
- **结算**：选择收货地址、支付方式、订单备注
- **订单**：下单、支付、取消（归还库存）、确认收货、再次购买
- **下单事务**：扣减库存与创建订单在同一事务内，库存不足自动回滚

### 2.2 用户发布商品（C2C 扩展）

核心原则：**用户提交的商品 ≠ 正式商品**。

```
用户填写商品信息 + 上传 1~9 张图片
        ↓
提交申请 → product_apply / product_apply_image
        ↓
管理员审核
   ├── 拒绝：保留记录 + 拒绝原因，用户可查看
   └── 通过（事务）：创建 product + 复制图片到 product_image
                     ↓
                  商品正式上架，记录 seller_id 归属
```

- 商品归属：审核通过时写入 `product.seller_id = 申请人`
- 审核防重：已审核的申请再次审核会被拒绝（业务码 `2005`）

### 2.3 商品多图

- 每个商品 **1~9 张**图片（前后端双重校验）
- 图片按 `sort` 排序，**第一张即主图**
- 详情页支持大图 + 缩略图切换
- 图片存储走 `product/年/月/uuid.ext` 目录，避免扁平化堆积

### 2.4 后台管理

- **数据看板**：销售额/订单量/客单价/新增用户 KPI、销售趋势（SVG 折线）、分类销售占比、订单状态分布、热销 Top5
- **商品管理**：搜索、分类筛选、新增/编辑/删除、图片上传
- **订单管理**：全量订单列表、状态筛选、发货（1→2）
- **发布申请**：申请列表、审核弹窗、通过/拒绝

### 2.5 消息提醒（角标）

单一数字 `store.pending`，按角色与所在层级决定显示位置：

| 角色 | 含义 | 页面外 | 页面内 |
|---|---|---|---|
| 管理员 | 待发货数（status=1） | 页头头像角标 + 下拉「后台管理」 | 侧边栏「订单管理」 |
| 普通用户 | 待收货数（status=2） | 页头头像角标 + 下拉「我的订单」 | 订单页「待收货」标签 |

任何时刻只显示一个角标，始终指向当前最该点击的位置。

---

## 三、技术栈

### 后端

| 依赖 | 版本 | 用途 |
|---|---|---|
| Spring Boot | 4.1.1 | Web MVC / 自动配置 |
| MyBatis Spring Boot Starter | 4.1.0 | 原生 MyBatis（XML Mapper） |
| MySQL Connector/J | Spring Boot 管理 | 数据库驱动 |
| JJWT | 0.12.7 | JWT 签发与校验 |
| spring-security-crypto | Spring Boot 管理 | BCrypt 密码加密 |
| spring-boot-starter-validation | Spring Boot 管理 | 参数校验 |
| Lombok | Spring Boot 管理 | 简化样板代码 |
| Aliyun OSS SDK | 3.17.4 | 图片上传 |

### 前端

- Vue 3.5（CDN，多源回退，支持离线本地文件）
- 原生 JS 模块化：`core / services / components / views / chart`
- 原生 SVG 手写图表，无第三方图表库
- Hash 路由（`#/list`、`#/detail/{id}` 等）

---

## 四、系统架构与目录结构

```
DhuStore
├── pom.xml
└── src/main
    ├── java/com/wenhe/dhustore
    │   ├── DhuStoreApplication.java      # 启动类（@MapperScan）
    │   ├── annotation/                   # @RequireLogin / @RequireAdmin
    │   ├── common/                       # Result / ResultCode / PageResult / 异常处理
    │   ├── config/                       # JWT 拦截器 / CORS / BCrypt / 示例账号初始化
    │   ├── controller/                   # 接口层
    │   ├── dto/                          # 请求体与 VO
    │   ├── entity/                       # 数据库实体
    │   ├── mapper/                       # MyBatis Mapper 接口
    │   ├── service/                      # 业务层（含事务）
    │   └── util/                         # JwtUtil / UserContext
    └── resources
        ├── application.properties        # 公共配置
        ├── application-local.properties  # 本地敏感配置（gitignore）
        ├── db/                           # 建表、种子数据、增量迁移
        ├── mapper/                       # Mapper XML
        └── static/                       # 前端页面（index.html + assets + src）
```

### 请求链路

```
浏览器 → Vue 前端 → fetch(/api/...)
                     ↓
             JwtInterceptor（解析 token，写入 UserContext）
                     ↓
             Controller → Service（事务）→ Mapper XML → MySQL
                     ↓
             统一响应 { code, message, data }
```

---

## 五、数据库设计

| 表 | 说明 |
|---|---|
| `user` | 用户（用户名、BCrypt 密码、角色、状态） |
| `category` | 商品分类 |
| `product` | 商品（含 `seller_id` 归属、`main_image` 主图冗余） |
| `product_image` | 商品图片（1~9 张，`sort=1` 为主图） |
| `product_apply` | 商品发布申请（0 待审核 / 1 通过 / 2 拒绝） |
| `product_apply_image` | 申请图片（审核通过后复制到 `product_image`） |
| `address` | 收货地址（支持默认地址） |
| `cart_item` | 购物车项（数量、勾选状态） |
| `orders` | 订单（含收货信息快照、状态） |
| `order_item` | 订单明细（商品名/图/单价快照） |

### 订单状态

| 状态 | 含义 | 触发方 |
|---|---|---|
| 0 | 待付款 | 下单后 |
| 1 | 已付款（待发货） | 用户支付 |
| 2 | 已发货（待收货） | 管理员发货 |
| 3 | 已完成 | 用户确认收货 |
| 4 | 已取消 | 用户取消（归还库存） |

### 商品申请状态

| 状态 | 含义 |
|---|---|
| 0 | 待审核 |
| 1 | 审核通过（已生成正式商品） |
| 2 | 审核拒绝（含拒绝原因） |

---

## 六、接口清单

### 通用约定

- 所有接口 HTTP 状态恒为 200，业务结果由响应体 `code` 区分
- 需登录接口携带：`Authorization: Bearer <token>`
- 响应结构：`{ "code": 200, "message": "操作成功", "data": ... }`

### 认证与用户

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/api/auth/register` | 注册（返回 token） | 公开 |
| POST | `/api/auth/login` | 登录 | 公开 |
| GET | `/api/users/me` | 当前用户信息 | 登录 |
| PUT | `/api/users/me` | 修改资料 | 登录 |

### 分类与商品

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/api/categories` | 分类列表 | 公开 |
| GET | `/api/categories/{id}` | 分类详情 | 公开 |
| GET | `/api/products?categoryId=&keyword=&status=&page=&size=` | 商品分页 | 公开 |
| GET | `/api/products/{id}` | 商品详情（含 `images`） | 公开 |
| POST | `/api/products` | 新增商品 | 管理员 |
| PUT | `/api/products/{id}` | 修改商品 | 管理员 |
| DELETE | `/api/products/{id}` | 删除商品 | 管理员 |

### 购物车

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/api/cart` | 购物车列表 | 登录 |
| POST | `/api/cart` | 加入购物车 | 登录 |
| PUT | `/api/cart/{id}` | 修改数量/勾选 | 登录 |
| PUT | `/api/cart/{id}/checked` | 修改勾选 | 登录 |
| DELETE | `/api/cart/{id}` | 删除 | 登录 |

### 收货地址

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/api/addresses` | 地址列表 | 登录 |
| POST | `/api/addresses` | 新增 | 登录 |
| PUT | `/api/addresses/{id}` | 修改 | 登录 |
| DELETE | `/api/addresses/{id}` | 删除 | 登录 |
| PUT | `/api/addresses/{id}/default` | 设为默认 | 登录 |

### 订单

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/api/orders` | 下单（结算勾选项） | 登录 |
| GET | `/api/orders` | 我的订单 | 登录 |
| GET | `/api/orders/summary` | 待付款/待收货数量 | 登录 |
| GET | `/api/orders/{orderNo}` | 订单详情 | 登录 |
| POST | `/api/orders/{orderNo}/pay` | 支付（0→1） | 登录 |
| POST | `/api/orders/{orderNo}/cancel` | 取消（0→4） | 登录 |
| POST | `/api/orders/{orderNo}/confirm` | 确认收货（2→3） | 登录 |
| POST | `/api/orders/{orderNo}/ship` | 发货（1→2） | 管理员 |

### 商品发布申请

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/api/product-apply` | 提交申请（`images` 1~9 张） | 登录 |
| GET | `/api/product-apply/my` | 我的申请 | 登录 |
| GET | `/api/admin/product-apply?status=` | 申请列表 | 管理员 |
| POST | `/api/admin/product-apply/{id}/approve` | 审核通过 | 管理员 |
| POST | `/api/admin/product-apply/{id}/reject` | 审核拒绝（`reason` 必填） | 管理员 |

### 图片上传

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/api/common/upload` | multipart 上传单张图片，返回 URL | 登录 |

### 后台

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/api/admin/stats?range=30` | 数据看板 | 管理员 |
| GET | `/api/admin/orders?page=&size=&status=` | 全量订单 | 管理员 |
| GET | `/api/admin/orders/pending-count` | 待发货数 | 管理员 |
| GET | `/api/admin/orders/summary` | 待付款/待发货摘要 | 管理员 |

---

## 七、业务状态码

| code | 含义 |
|---|---|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未登录 / token 过期 |
| 403 | 无权限（非管理员） |
| 404 | 资源不存在 |
| 500 | 服务器错误 |
| 1001 | 用户名已存在 |
| 1002 | 用户名或密码错误 |
| 1003 | 账号已被禁用 |
| 2001 | 商品库存不足 |
| 2002 | 购物车为空 |
| 2003 | 订单不存在 |
| 2004 | 订单状态不允许该操作 |
| 2005 | 该申请已审核 |
| 2006 | 单张图片超过 5MB |
| 2007 | 图片格式不支持 |
| 2008 | 图片数量需为 1-9 张 |
| 2009 | 图片上传失败 |
| 2010 | OSS 未配置 AccessKey |

---

## 八、图片上传设计

### 校验规则（前后端双重）

1. 单张 ≤ 5MB
2. 仅支持 `jpg / jpeg / png / webp`
3. 服务端校验 `Content-Type`
4. 文件名使用 **UUID 重命名**，不直接使用用户文件名
5. 本地存储额外做路径穿越防护

### 存储模式

| 模式 | 配置 | 访问方式 |
|---|---|---|
| 本地磁盘（默认回退） | `storage.type=local` | `/uploads/...` 静态映射 |
| 阿里云 OSS | `storage.type=oss` + 密钥 | OSS 公网 URL |

OSS 对象路径：`product/{yyyy}/{MM}/{uuid}.{ext}`

> Bucket 需设置为「公共读」，否则图片 URL 会返回 403。

---

## 九、配置说明

### `application.properties`（可提交）

```properties
server.port=8080

spring.datasource.url=jdbc:mysql://localhost:3306/dhustore?...
spring.datasource.username=${DB_USERNAME:root}
spring.datasource.password=${DB_PASSWORD:}

jwt.secret=${JWT_SECRET:}
jwt.expiration=86400000

spring.servlet.multipart.max-file-size=5MB
spring.servlet.multipart.max-request-size=50MB
file.upload-dir=uploads
file.public-prefix=/uploads

storage.type=oss
aliyun.oss.endpoint=oss-cn-shanghai.aliyuncs.com
aliyun.oss.bucket=dhu-stroe
aliyun.oss.dir-prefix=product
aliyun.oss.access-key-id=${ALIYUN_OSS_ACCESS_KEY_ID:}
aliyun.oss.access-key-secret=${ALIYUN_OSS_ACCESS_KEY_SECRET:}
```

### `application-local.properties`（**已 gitignore，禁止提交**）

```properties
spring.datasource.username=root
spring.datasource.password=你的密码
jwt.secret=至少32字节的随机串
aliyun.oss.access-key-id=你的AccessKeyId
aliyun.oss.access-key-secret=你的AccessKeySecret
```

也可以用环境变量注入：`DB_USERNAME` / `DB_PASSWORD` / `JWT_SECRET` / `ALIYUN_OSS_ACCESS_KEY_ID` / `ALIYUN_OSS_ACCESS_KEY_SECRET`。

---

## 十、本地启动

### 1. 初始化数据库

```bash
mysql -uroot -p < src/main/resources/db/schema.sql
mysql -uroot -p < src/main/resources/db/data.sql
```

已有旧库则按顺序执行增量脚本：

```bash
mysql -uroot -p < src/main/resources/db/migration_1_product_apply.sql
mysql -uroot -p < src/main/resources/db/migration_2_product_image.sql
```

### 2. 配置凭据

编辑 `src/main/resources/application-local.properties`，填入数据库密码、JWT 密钥、OSS AccessKey。

### 3. 启动

```bash
mvn spring-boot:run
```

访问：<http://localhost:8080>

### 4. 示例账号

应用启动时自动创建（幂等，已存在则跳过）：

| 账号 | 密码 | 角色 |
|---|---|---|
| `admin` | `123456` | 管理员 |
| `user` | `123456` | 普通用户 |

---

## 十一、前端说明

- 入口：`src/main/resources/static/index.html`
- 路由（Hash）：
  - `#/` 首页、`#/list` 商品列表、`#/detail/{id}` 商品详情
  - `#/cart` 购物车、`#/checkout` 结算、`#/orders` 我的订单
  - `#/user` 个人中心（含申请发布商品、我的商品申请）
  - `#/admin` 后台管理
- 页脚仅在**首页**展示
- 模块划分：
  - `core.js`：工具、字典、全局状态、路由、API 封装
  - `services.js`：业务服务（含图片上传）
  - `components.js`：页头、页脚、商品卡片
  - `views/*`：各页面组件
  - `chart.js`：SVG 图表引擎

---

## 十二、已知限制与后续规划

### 当前限制

- 消息提醒为**拉取式**（登录/操作后刷新），无 WebSocket 实时推送
- 图片排序按上传顺序，暂不支持拖拽
- 商品申请/商品列表未做全文检索，使用 `LIKE`
- 单机部署，未引入缓存与消息队列

### 可扩展方向

- 我的商品（按 `seller_id` 展示用户自己上架的商品）
- WebSocket / SSE 实现订单与审核实时通知
- 图片拖拽排序、图片压缩、CDN 加速
- Redis 缓存热点商品、秒杀限流
- 订单超时自动取消（定时任务）
- 支付对接真实第三方支付
- 单元测试与接口自动化测试

---

## 十三、安全说明

- 密码使用 BCrypt 加密存储，接口不返回密码字段
- JWT 密钥与数据库密码、OSS AccessKey 均放在 `application-local.properties` 或环境变量，不进入仓库
- 上传接口做大小、格式、Content-Type、UUID 重命名、路径穿越多重校验
- 后台接口统一 `@RequireAdmin`，服务端校验角色，不依赖前端隐藏按钮
- 商品详情按纯文本渲染，避免存储型 XSS

---

*文档版本：V1.0 ｜ 最后更新：2026-10-21*
