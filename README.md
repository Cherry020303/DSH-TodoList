# DSH TodoList

一个运行在 DeepSeek Harness（DSH）Web UI 中的个人待办便签墙插件。安装后会在 DSH 左侧栏增加 `TodoList` 入口，用粉彩便签按日期展示待办事项。

当前版本：`3.2.2`

## 主要功能

- 创建、编辑和删除待办事项；删除操作需要二次确认。
- 每条待办包含必填标题，以及可选地点和日期时间。
- 提供 12 种粉彩便签颜色；新建待办时会随机预选一种颜色。
- 按日期分组显示，未设置日期的待办归入“未安排”。
- 日期标题显示星期，并对今天、明天和昨天使用相对日期提示。
- 同一日期内，待完成事项排在已完成事项之前，再按时间排序。
- 逾期且尚未完成的事项使用红色时间文字和“已逾期”标签提示。
- 点击卡片左侧状态圆点，可快速切换待完成和已完成状态。
- 支持按标题或地点搜索，以及“全部 / 待完成 / 已完成”筛选。
- 左侧栏显示待完成数量徽标，显示值最高为 `99`。
- 界面跟随 DSH 当前语言，内置中文和英文文案。
- 响应式布局：宽屏三列、中等宽度两列、窄屏单列。

## 运行环境

本项目是 DSH/Cordis bundle，不是独立 Web 应用。运行时需要：

- 已安装并可正常运行的 DeepSeek Harness。
- DSH Web UI 及其客户端模块加载器。
- DSH 提供的 React、`slots` 和 `locale` 运行时能力。
- 支持 `localStorage` 和 `datetime-local` 输入控件的现代浏览器环境。

项目不包含独立服务器、构建脚本或第三方 npm 依赖，不能通过 `node index.js` 单独启动。

## 安装

### 1. 获取源码

```powershell
git clone https://github.com/Cherry020303/DSH-TodoList.git
cd DSH-TodoList
```

也可以直接下载仓库 ZIP 并解压。

### 2. 安装到 DSH

在 DSH 中将该仓库的**绝对目录**作为本地 bundle 安装，并启用包 `@local/todolist`。例如仓库位于：

```text
D:\DeepseekHarnessWorkSpace\DSH-TodoList
```

可以在 DSH 会话中要求 Agent 安装这个本地插件目录。安装成功后，刷新当前 DSH Web 页面；左侧栏会出现 `TodoList` 入口。

> DSH 的具体插件管理入口可能随版本和配置不同。本仓库自身没有通用的独立安装命令，也不应直接复制文件到 DSH profile 目录。

## 配置

当前版本没有用户配置页或环境变量。可调整内容都在插件界面内完成：

- 标题：必填。
- 地点：可选，自由文本。
- 日期与时间：可选，使用浏览器原生日期时间选择器。
- 便签颜色：从 12 种内置颜色中选择。
- 状态：待完成或已完成。

插件注册信息如下：

- 包名：`@local/todolist`
- Cordis 插件 ID：`todo-list`
- 侧栏面板 ID：`todo-list`
- 客户端平台：`web`

## 启动与使用

插件随 DSH Web 客户端加载，不需要单独执行启动命令。

1. 启动 DSH 并打开其 Web UI。
2. 点击左侧栏的 `TodoList`。
3. 点击右下角 `+` 创建待办。
4. 填写标题，按需设置地点、日期时间和颜色，然后保存。
5. 点击状态圆点快速完成或恢复待办。
6. 点击卡片本身打开编辑窗口，可修改内容、切换状态或删除。
7. 使用顶部搜索框按标题或地点搜索，或使用状态筛选器缩小范围。

按 `Esc` 可以关闭新增或编辑窗口。卡片获得键盘焦点后，也可使用 `Enter` 或空格打开编辑窗口。

## 数据存储

待办数据保存在当前浏览器环境的 `localStorage` 中：

```text
dsh.my-todos.v1
```

插件还会读取旧版便签墙的数据键，并在需要时迁移到当前格式：

```text
dsh.sticky-notes-wall.v1
```

当前待办数据结构包含：

```js
{
  id,
  title,
  location,
  due,
  status,
  color,
  createdAt,
  updatedAt
}
```

注意：

- 数据属于当前 DSH Web 页面对应的浏览器存储，不会由本仓库或插件自动同步到 GitHub。
- 更换浏览器、浏览器配置、站点地址或清除站点数据后，原有待办可能不可见或丢失。
- 当前版本没有内置导入、导出、云同步或服务端备份功能。
- 重新安装或更新插件时不要主动清除上述存储键。

## 常用命令

项目没有定义 `npm run` 脚本。开发时可使用以下命令。

检查客户端 JavaScript 语法：

```powershell
node --check .\client.js
```

检查 JSON 文件能否解析：

```powershell
node -e "const fs=require('fs'); for (const file of ['package.json','locale/zh.json','locale/en.json']) JSON.parse(fs.readFileSync(file,'utf8')); console.log('JSON OK')"
```

拉取仓库更新：

```powershell
git pull
```

修改后提交并推送：

```powershell
git add .
git commit -m "Describe the change"
git push
```

源码更新后，需要让 DSH 重新应用或重新安装本地 bundle，并刷新 DSH Web 页面。仅执行 `git pull` 不保证当前已加载的客户端模块自动更新。

## 目录结构

```text
DSH-TodoList/
├─ client.js          # TodoList 客户端 UI、交互、样式和本地数据逻辑
├─ cordis.patch.yml   # 将 @local/todolist 插入 Cordis 组合
├─ icon.svg           # bundle 展示图标
├─ index.js           # Host 入口；当前为空实现，UI 由客户端模块提供
├─ locale/
│  ├─ en.json         # 英文 bundle 元数据
│  └─ zh.json         # 中文 bundle 元数据
└─ package.json       # 包清单、导出项和 DSH 客户端声明
```

## 实现说明

- `client.js` 通过 `window.__ModuleLoader__.load()` 注册客户端模块。
- 插件向 `sidebar.panellist` 注册侧栏入口，并向 `main` 注册对应主面板。
- Host 入口 `index.js` 只导出空的 `apply()`；当前功能全部位于客户端。
- 日期和时间按浏览器本地时区解释和显示。
- 旧版颜色名会映射到当前颜色集合，以保持历史数据兼容。

## 注意事项

- `package.json` 中的 `private: true` 表示当前项目未配置为 npm 公共包；GitHub 源码仓库不等同于 npm 或 DSH 插件市场发布。
- 不要修改包名 `@local/todolist`、Cordis 插件 ID 或面板 ID，除非同时更新所有相关引用并重新安装插件。
- 不要随意更改 `localStorage` 键名，否则现有用户数据将无法被当前版本读取。
- 本仓库未声明许可证文件；在许可证明确之前，不应假定某种开源许可证条款。
