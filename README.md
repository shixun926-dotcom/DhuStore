# DhuStore 后端

一个购物系统的后端框架，前后端分离，接口返回统一 JSON 结构。

## 技术栈

- Spring Boot 4.1.1 / Java 17
- 原生 MyBatis（XML Mapper）+ MySQL
- JWT 无状态鉴权（jjwt 0.12.7）
- 密码 BCrypt 加密（spring-security-crypto）
- Lombok + 参数校验（jakarta validation）

## 项目结构

```
com.wenhe.dhustore
├── DhuStoreApplication      # 启动类（含 @MapperScan）
├── annotation/RequireLogin  # 登录校验注解
├── common/                  # Result / ResultCode / PageResult / 异常处理
├── config/                  # JwtInterceptor / WebMvcConfig(CORS) / BeanConfig
├── controller/              # 接口层
├── dto/                     # 请求/响应对象（含 VO）
├── entity/                  # 数据库实体
├── mapper/                  # MyBatis Mapper 接口
├── service/                 # 业务层
└── util/                    # JwtUtil / UserContext
```

对应 XML 位于 `src/main/resources/mapper/*.xml`，建表脚本位于 `src/main/resources/db/`。

## 快速启动

1. 准备 MySQL，执行建表脚本：
   ```bash
   mysql -uroot -p < src/main/resources/db/schema.sql
   mysql -uroot -p < src/main/resources/db/data.sql
   ```

2. 配置数据库密码与 JWT 密钥（**仓库中不含任何真实凭据**）：
   ```bash
   cp src/main/resources/application.properties.example src/main/resources/application-local.properties
   ```
   然后填入自己的 `spring.datasource.username` / `spring.datasource.password` / `jwt.secret`。
   `application-local.properties` 已被 `.gitignore` 忽略，不会被提交。
   也可以改用环境变量注入：`DB_USERNAME` / `DB_PASSWORD` / `JWT_SECRET`（优先级高于本地配置文件）。
   `jwt.secret` 需至少 32 字节，可用 `openssl rand -base64 48` 生成。

3. 启动应用：
   ```bash
   mvn spring-boot:run
   ```
   服务默认运行在 `http://localhost:8080`。

4. 先注册一个账号（密码会以 BCrypt 加密存储）：
   ```bash
   curl -X POST http://localhost:8080/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"demo","password":"123456","nickname":"演示用户"}'
   ```

## 接口约定

### 统一响应结构

所有接口返回 HTTP 200，业务结果通过 `code` 字段区分：

```json
{ "code": 200, "message": "操作成功", "data": {} }
```

- `200` 成功；`400` 参数错误；`401` 未登录/token 失效；`404` 资源不存在；`500` 服务器错误。
- 业务码：`1001` 用户名已存在、`1002` 用户名或密码错误、`2001` 库存不足、`2002` 购物车为空等。

### 鉴权

登录/注册后返回 `token`，需要登录的接口在请求头携带：

```
Authorization: Bearer <token>
```

无需登录的公开接口：分类列表、商品列表/详情、登录、注册。其余接口标注 `@RequireLogin`。

## 接口列表

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册 | 否 |
| POST | `/api/auth/login` | 登录 | 否 |
| GET | `/api/users/me` | 当前用户信息 | 是 |
| GET | `/api/categories` | 分类列表 | 否 |
| GET | `/api/categories/{id}` | 分类详情 | 否 |
| GET | `/api/products?categoryId=&keyword=&page=&size=` | 商品分页列表 | 否 |
| GET | `/api/products/{id}` | 商品详情 | 否 |
| GET | `/api/cart` | 购物车列表 | 是 |
| POST | `/api/cart` | 加入购物车 | 是 |
| PUT | `/api/cart/{id}` | 修改数量 | 是 |
| PUT | `/api/cart/{id}/checked` | 选中/取消选中 | 是 |
| DELETE | `/api/cart/{id}` | 删除购物车项 | 是 |
| GET | `/api/addresses` | 地址列表 | 是 |
| POST | `/api/addresses` | 新增地址 | 是 |
| PUT | `/api/addresses/{id}` | 修改地址 | 是 |
| DELETE | `/api/addresses/{id}` | 删除地址 | 是 |
| PUT | `/api/addresses/{id}/default` | 设为默认地址 | 是 |
| POST | `/api/orders` | 下单（结算购物车勾选项） | 是 |
| GET | `/api/orders` | 订单列表 | 是 |
| GET | `/api/orders/{orderNo}` | 订单详情 | 是 |
| POST | `/api/orders/{orderNo}/pay` | 支付（0→1） | 是 |
| POST | `/api/orders/{orderNo}/cancel` | 取消（0→4，归还库存） | 是 |

## 待完善（供后续扩展）

- 管理员后台（商品/分类/订单管理接口，可复用已有 Mapper 的 insert/update/delete）
- 订单发货/完成流转（状态 2/3）
- 登录失败次数限制、token 刷新、参数级联校验
- 单元测试与接口测试
