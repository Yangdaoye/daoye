# 恒星形成模拟器 · 结题答辩材料

## 交付物

- `恒星形成模拟器_结题答辩.pptx`：结题答辩 PPT（约 26 页）
- `assets/diagrams/`：系统架构、网站流程、制作流程、接线图、测试流程等图示
- `scripts/generate_diagrams.py` / `scripts/generate_ppt.py`：可重新生成

## PPT 结构

1. 封面
2. 目录
3. 研究背景与意义（开题保留）
4. 研究内容与目标
5. 技术路线 / 系统架构
6. 网站功能总览与截图位
7. 网站制作过程（流程图 + 过程图片位）
8. 接线图 / 实物对照位 / 流程图说明
9. 互动手套制作过程与结果
10. 智能手套功能测试（流程 + 结果表 + 图片位）
11. 总结与展望
12. 参考文献
13. 感悟与致谢

## 重要说明：本地素材未接入

当前 Cloud Agent **无法访问**：

1. Codex 聊天 `019f97f6-b821-7270-9d07-ace0ec83b3aa` 中的开题答辩 PPT  
2. macOS 路径 `/Volumes/YIKE_BACKUP/恒星形成模拟器` 下的图片资料  

因此 PPT 中网站截图、制作过程实拍、实物接线照片等位置使用了 **【待插入图片】** 占位框。

### 如何补全实拍图片

请将素材拷贝到本仓库后告知继续精修，例如：

```text
stellar-formation-defense/
  assets/
    photos/
      website/          # 网站功能截图
      website-process/  # 网站制作过程
      wiring/           # 实际接线照片
      glove/            # 手套制作过程与成品
      test/             # 测试现场与数据曲线
    opening/            # 开题答辩 PPT（可选，用于对齐文案）
```

然后重新运行：

```bash
python3 scripts/generate_diagrams.py
python3 scripts/generate_ppt.py
```

## 重新生成

```bash
pip install python-pptx pillow matplotlib
python3 scripts/generate_diagrams.py
python3 scripts/generate_ppt.py
```
