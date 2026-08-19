#!/usr/bin/env python3
"""Generate 恒星形成模拟器 + 智能手套 结题答辩 PPT."""

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.oxml import parse_xml
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
DIAG = ROOT / "assets" / "diagrams"
OUT = ROOT / "恒星形成模拟器_结题答辩.pptx"

# Theme
BG = RGBColor(0x0B, 0x1B, 0x2B)
PANEL = RGBColor(0x13, 0x2A, 0x40)
ACCENT = RGBColor(0xF0, 0xB4, 0x29)
CYAN = RGBColor(0x4E, 0xC3, 0xD8)
WHITE = RGBColor(0xF5, 0xF7, 0xFA)
MUTED = RGBColor(0xA8, 0xB8, 0xC8)
SOFT = RGBColor(0x1A, 0x33, 0x48)


def set_slide_bg(slide, rgb=BG):
    """Fill slide background with solid color."""
    bg = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(7.5)
    )
    bg.fill.solid()
    bg.fill.fore_color.rgb = rgb
    bg.line.fill.background()
    # send to back
    spTree = slide.shapes._spTree
    sp = bg._element
    spTree.remove(sp)
    spTree.insert(2, sp)
    return bg


def add_accent_bar(slide, y=0.35):
    bar = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(0.55), Inches(y), Inches(0.12), Inches(0.55)
    )
    bar.fill.solid()
    bar.fill.fore_color.rgb = ACCENT
    bar.line.fill.background()
    return bar


def set_run(run, size=18, bold=False, color=WHITE, name="Microsoft YaHei"):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = name
    # East Asian font
    rPr = run._r.get_or_add_rPr()
    ea = rPr.find("{http://schemas.openxmlformats.org/drawingml/2006/main}ea")
    if ea is None:
        ea = parse_xml(
            f'<a:ea xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" typeface="{name}"/>'
        )
        rPr.append(ea)
    else:
        ea.set("typeface", name)


def add_text(slide, left, top, width, height, text, size=18, bold=False, color=WHITE, align=PP_ALIGN.LEFT, font="Microsoft YaHei"):
    box = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(height))
    tf = box.text_frame
    tf.word_wrap = True
    lines = text.split("\n") if isinstance(text, str) else text
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        run = p.add_run()
        run.text = line
        set_run(run, size=size, bold=bold, color=color, name=font)
    return box


def add_title(slide, text, subtitle=None):
    add_accent_bar(slide)
    add_text(slide, 0.85, 0.32, 11.5, 0.6, text, size=28, bold=True, color=WHITE)
    if subtitle:
        add_text(slide, 0.85, 0.9, 11.5, 0.4, subtitle, size=14, color=MUTED)


def card(slide, left, top, width, height, title, body, accent=CYAN):
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height)
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = PANEL
    shape.line.color.rgb = accent
    shape.line.width = Pt(1.25)
    add_text(slide, left + 0.2, top + 0.15, width - 0.4, 0.4, title, size=16, bold=True, color=accent)
    add_text(slide, left + 0.2, top + 0.55, width - 0.4, height - 0.7, body, size=13, color=WHITE)
    return shape


def placeholder_card(slide, left, top, width, height, label):
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height)
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = SOFT
    shape.line.color.rgb = ACCENT
    shape.line.width = Pt(1.5)
    # dashed look via caption
    add_text(
        slide,
        left + 0.15,
        top + height / 2 - 0.45,
        width - 0.3,
        0.9,
        f"【待插入图片】\n{label}",
        size=12,
        color=ACCENT,
        align=PP_ALIGN.CENTER,
    )
    return shape


def add_footer(slide, page, total):
    add_text(slide, 0.55, 7.05, 8, 0.3, "恒星形成模拟器 · 结题答辩", size=10, color=MUTED)
    add_text(slide, 11.2, 7.05, 1.5, 0.3, f"{page} / {total}", size=10, color=MUTED, align=PP_ALIGN.RIGHT)


def add_bullets(slide, left, top, width, height, items, size=16, color=WHITE):
    box = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(height))
    tf = box.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        p.level = 0
        p.space_after = Pt(8)
        run = p.add_run()
        run.text = f"●  {item}"
        set_run(run, size=size, color=color)
    return box


def add_image_fit(slide, path, left, top, width, height):
    if not Path(path).exists():
        placeholder_card(slide, left, top, width, height, Path(path).name)
        return None
    return slide.shapes.add_picture(str(path), Inches(left), Inches(top), Inches(width), Inches(height))


def build():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank = prs.slide_layouts[6]

    slides_meta = []  # filled as we go; footer applied at end
    built = []

    def new_slide():
        s = prs.slides.add_slide(blank)
        set_slide_bg(s)
        built.append(s)
        return s

    # ===== 1 Cover =====
    s = new_slide()
    # decorative top line
    line = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.08))
    line.fill.solid()
    line.fill.fore_color.rgb = ACCENT
    line.line.fill.background()
    add_text(s, 0.8, 1.6, 11.5, 0.4, "结题答辩", size=18, color=ACCENT, align=PP_ALIGN.CENTER)
    add_text(
        s, 0.8, 2.1, 11.5, 1.2,
        "基于智能交互手套的\n恒星形成模拟器设计与实现",
        size=36, bold=True, color=WHITE, align=PP_ALIGN.CENTER,
    )
    add_text(
        s, 0.8, 4.0, 11.5, 0.8,
        "保留开题研究背景与方案，重点展示网站成果、硬件制作、联调测试与总结展望",
        size=15, color=MUTED, align=PP_ALIGN.CENTER,
    )
    add_text(
        s, 0.8, 5.3, 11.5, 1.0,
        "答辩人：________　　指导教师：________\n学院 / 专业：________　　日期：________",
        size=14, color=WHITE, align=PP_ALIGN.CENTER,
    )

    # ===== 2 TOC =====
    s = new_slide()
    add_title(s, "目录 CONTENTS")
    toc = [
        ("01", "研究背景与意义（开题保留）"),
        ("02", "研究内容与总体方案"),
        ("03", "技术路线与系统架构"),
        ("04", "恒星形成模拟器网站设计与功能"),
        ("05", "网站制作过程展示"),
        ("06", "接线图与流程图"),
        ("07", "互动手套制作过程与结果"),
        ("08", "智能手套功能测试"),
        ("09", "总结与展望"),
        ("10", "参考文献 · 感悟与致谢"),
    ]
    for i, (num, title) in enumerate(toc):
        col = i // 5
        row = i % 5
        x = 0.9 + col * 6.1
        y = 1.4 + row * 1.0
        add_text(s, x, y, 0.8, 0.4, num, size=20, bold=True, color=ACCENT)
        add_text(s, x + 0.9, y + 0.05, 4.8, 0.4, title, size=16, color=WHITE)

    # ===== 3 Background =====
    s = new_slide()
    add_title(s, "一、研究背景与意义", "开题内容保留与凝练")
    card(
        s, 0.7, 1.5, 5.8, 2.4,
        "科学背景",
        "恒星形成是天体物理学的核心议题之一。分子云在引力作用下坍缩，历经致密核、原恒星到主序星等阶段。传统课堂讲解抽象，难以直观感受多物理过程的耦合与反馈。",
        ACCENT,
    )
    card(
        s, 6.8, 1.5, 5.8, 2.4,
        "教育痛点",
        "纯二维图示与视频演示缺少“可操作”体验；学生对参数如何影响坍缩、碎裂与反馈缺乏即时反馈。需要可视化 + 体感交互的学习载体。",
        CYAN,
    )
    card(
        s, 0.7, 4.2, 11.9, 2.3,
        "本课题意义",
        "搭建恒星形成过程的交互式网站模拟器，并研制可穿戴智能手套，用手势实时操控仿真参数与场景进程，实现“看—做—悟”一体化科普与教学演示，提升课题的工程落地与展示完整性。",
        ACCENT,
    )

    # ===== 4 Goals =====
    s = new_slide()
    add_title(s, "二、研究内容与目标")
    add_bullets(
        s, 0.9, 1.5, 11.5, 5.2,
        [
            "梳理恒星形成关键物理图像与教学演示需求，明确可视化场景与交互目标。",
            "设计并实现恒星形成模拟器网站：场景展示、参数调节、过程动画与结果反馈。",
            "研制互动智能手套：弯曲传感、姿态感知、主控通信与手势映射。",
            "完成手套与网站联调，形成可演示的人机交互闭环。",
            "整理制作过程、测试结果、总结展望与答辩材料。",
        ],
        size=17,
    )

    # ===== 5 Roadmap =====
    s = new_slide()
    add_title(s, "三、技术路线")
    add_image_fit(s, DIAG / "07_overall_roadmap.png", 0.55, 1.25, 12.2, 5.5)

    # ===== 6 Architecture =====
    s = new_slide()
    add_title(s, "三、系统总体架构")
    add_image_fit(s, DIAG / "01_system_architecture.png", 0.55, 1.2, 12.2, 5.6)

    # ===== 7 Website overview =====
    s = new_slide()
    add_title(s, "四、恒星形成模拟器网站 · 功能总览")
    add_image_fit(s, DIAG / "02_website_flow.png", 0.4, 1.2, 12.5, 5.6)

    # ===== 8 Website features with screenshot placeholders =====
    s = new_slide()
    add_title(s, "四、网站功能展示（截图）", "请替换为实际网站截图")
    feats = [
        (0.55, "首页 / 场景入口", "展示项目主题与模拟入口，建立沉浸式第一印象。"),
        (3.7, "参数调节面板", "初始密度、温度、扰动等参数可视化调节。"),
        (6.85, "三维 / 动画仿真", "分子云坍缩至原恒星形成的动态过程。"),
        (10.0, "手套控制状态", "实时显示手势指令与映射反馈。"),
    ]
    for left, title, desc in feats:
        placeholder_card(s, left, 1.35, 2.95, 3.4, title)
        add_text(s, left, 4.9, 2.95, 1.5, f"{title}\n{desc}", size=12, color=WHITE, align=PP_ALIGN.CENTER)

    # ===== 9 More website screenshots =====
    s = new_slide()
    add_title(s, "四、网站主要功能补充截图")
    placeholder_card(s, 0.55, 1.35, 6.0, 5.2, "功能截图：引力坍缩 / 碎裂过程")
    placeholder_card(s, 6.8, 1.35, 6.0, 2.4, "功能截图：原恒星与盘结构")
    placeholder_card(s, 6.8, 4.0, 6.0, 2.55, "功能截图：反馈机制 / 结果对比")

    # ===== 10 Website making process =====
    s = new_slide()
    add_title(s, "五、网站制作过程")
    add_image_fit(s, DIAG / "03_website_dev_process.png", 0.4, 1.15, 12.5, 5.7)

    # ===== 11 Website process photos =====
    s = new_slide()
    add_title(s, "五、网站制作过程图片", "请替换为设计稿、编码界面、调试与部署照片")
    for i, label in enumerate([
        "线框 / UI 设计",
        "前端开发界面",
        "仿真效果调试",
        "功能联调记录",
        "移动端 / 演示适配",
        "版本迭代对比",
    ]):
        r, c = divmod(i, 3)
        placeholder_card(s, 0.55 + c * 4.2, 1.35 + r * 2.8, 3.95, 2.5, label)

    # ===== 12 Wiring =====
    s = new_slide()
    add_title(s, "六、硬件接线图")
    add_image_fit(s, DIAG / "04_wiring_diagram.png", 0.35, 1.1, 12.6, 5.7)

    # ===== 13 Wiring photo placeholder =====
    s = new_slide()
    add_title(s, "六、实际接线与实物对照", "请插入真实接线图 / 面包板 / PCB 照片")
    placeholder_card(s, 0.55, 1.35, 6.0, 5.2, "实物接线图 / 焊接细节")
    placeholder_card(s, 6.8, 1.35, 6.0, 5.2, "手套内部走线与模块布局")

    # ===== 14 Flowcharts =====
    s = new_slide()
    add_title(s, "六、流程图汇总")
    add_bullets(
        s, 0.9, 1.5, 11.5, 5.0,
        [
            "系统架构图：手套 → 主控通信 → 网站仿真反馈。",
            "网站交互流程：进入场景 → 调参 → 仿真 → 手势操控。",
            "手套制作流程：选材 → 固定传感 → 组装 → 固件 → 联调。",
            "测试流程：硬件自检 → 标定 → 识别 → 延迟与联调验证。",
        ],
        size=18,
    )

    # ===== 15 Glove making =====
    s = new_slide()
    add_title(s, "七、互动手套制作过程")
    add_image_fit(s, DIAG / "05_glove_build_flow.png", 0.4, 1.15, 12.5, 5.7)

    # ===== 16 Glove process photos =====
    s = new_slide()
    add_title(s, "七、手套制作过程与结果图片", "请替换为制作过程实拍")
    labels = [
        "材料准备",
        "传感器固定",
        "主控与姿态模块安装",
        "走线与供电封装",
        "成品正面 / 佩戴效果",
        "与电脑联调现场",
    ]
    for i, label in enumerate(labels):
        r, c = divmod(i, 3)
        placeholder_card(s, 0.55 + c * 4.2, 1.35 + r * 2.8, 3.95, 2.5, label)

    # ===== 17 Glove results =====
    s = new_slide()
    add_title(s, "七、制作结果说明")
    card(s, 0.7, 1.5, 5.9, 4.8, "硬件结果",
         "· 完成可穿戴交互手套样机\n· 集成多路弯曲传感与姿态模块\n· 实现无线/串口数据上传\n· 外观满足演示佩戴需求\n\n（可在此补充尺寸、功耗、续航等实测数据）",
         ACCENT)
    card(s, 6.9, 1.5, 5.9, 4.8, "软件 / 映射结果",
         "· 完成手势指令集定义\n· 弯曲量归一化与阈值判定\n· 手势映射到网站控制事件\n· 形成可重复演示流程\n\n（可补充手势表：握拳=开始、张开=重置、倾斜=调参等）",
         CYAN)

    # ===== 18 Test flow =====
    s = new_slide()
    add_title(s, "八、智能手套功能测试")
    add_image_fit(s, DIAG / "06_test_flow.png", 0.4, 1.15, 12.5, 5.7)

    # ===== 19 Test results =====
    s = new_slide()
    add_title(s, "八、测试内容与结果", "请按实测数据更新表格数值")
    # simple table via cards
    rows = [
        ("测试项", "方法", "预期", "结果"),
        ("单指弯曲响应", "逐指弯曲采集", "曲线单调可分", "☐ 通过 / 数据：___"),
        ("典型手势识别", "握拳/张开/指向", "识别稳定", "☐ 通过 / 准确率：___"),
        ("通信延迟", "指令到画面响应", "< 200 ms 量级", "☐ 实测：___ ms"),
        ("连续操作稳定性", "连续演示 5–10 min", "无明显断连", "☐ 通过 / 备注：___"),
        ("网站联调", "手势驱动场景", "参数/场景正确变化", "☐ 通过"),
    ]
    # header
    headers = rows[0]
    for i, h in enumerate(headers):
        x = 0.55 + i * 3.15
        shape = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(1.4), Inches(3.05), Inches(0.55))
        shape.fill.solid()
        shape.fill.fore_color.rgb = ACCENT
        shape.line.fill.background()
        add_text(s, x, 1.48, 3.05, 0.4, h, size=14, bold=True, color=BG, align=PP_ALIGN.CENTER)
    for r, row in enumerate(rows[1:]):
        y = 2.05 + r * 0.85
        for i, cell in enumerate(row):
            x = 0.55 + i * 3.15
            shape = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(3.05), Inches(0.78))
            shape.fill.solid()
            shape.fill.fore_color.rgb = PANEL if r % 2 == 0 else SOFT
            shape.line.color.rgb = RGBColor(0x20, 0x3A, 0x52)
            add_text(s, x + 0.08, y + 0.2, 2.9, 0.5, cell, size=12, color=WHITE, align=PP_ALIGN.CENTER)

    # ===== 20 Test photos =====
    s = new_slide()
    add_title(s, "八、测试过程图片")
    placeholder_card(s, 0.55, 1.35, 6.0, 5.2, "测试现场：佩戴与动作采集")
    placeholder_card(s, 6.8, 1.35, 6.0, 2.4, "串口 / 数据曲线截图")
    placeholder_card(s, 6.8, 4.0, 6.0, 2.55, "手势驱动网站画面对比")

    # ===== 21 Summary =====
    s = new_slide()
    add_title(s, "九、总结")
    add_bullets(
        s, 0.9, 1.5, 11.5, 5.2,
        [
            "完成了恒星形成模拟器网站的设计与实现，覆盖场景展示、参数调节与过程可视化等核心功能。",
            "完成了互动智能手套的硬件制作、固件与通信，并实现与网站的手势映射联调。",
            "形成了较完整的工程链条：方案 → 网站 → 硬件 → 测试 → 演示材料。",
            "课题将抽象天体物理过程转化为可操作的交互体验，具备教学演示与科普展示价值。",
        ],
        size=17,
    )

    # ===== 22 Outlook =====
    s = new_slide()
    add_title(s, "九、不足与展望")
    card(s, 0.7, 1.5, 5.9, 4.8, "当前不足",
         "· 物理模型仍偏教学简化，精度有限\n· 手套佩戴舒适度与量产工艺待优化\n· 复杂手势集与抗干扰能力可再提升\n· 多用户同时交互与移动端适配不足\n· 过程记录与自动化测评尚不完善",
         ACCENT)
    card(s, 6.9, 1.5, 5.9, 4.8, "后续展望",
         "· 引入更精细的流体 / 反馈可视化\n· 优化传感布局与无线稳定性\n· 扩展手势库与自适应标定\n· 增加教学模式与关卡化学习路径\n· 沉淀开源文档，便于复现与推广",
         CYAN)

    # ===== 23 References =====
    s = new_slide()
    add_title(s, "十、参考文献")
    refs = [
        "[1] McKee C. F., Ostriker E. C. Theory of Star Formation. ARA&A, 2007.",
        "[2] Krumholz M. R. The Formation of Very Massive Stars. 相关综述与教材章节.",
        "[3] 孙凯等. 分子云与恒星形成相关教材 / 讲义（按实际引用替换）.",
        "[4] 数据手套与手势识别相关论文：弯曲传感、IMU 姿态融合方法.",
        "[5] Three.js / WebGL 可视化与前端工程文档（按实际技术栈替换）.",
        "[6] ESP32 / Arduino 官方文档与 BLE 通信应用笔记.",
        "[7] 开题报告及本课题阶段过程记录、测试日志.",
        "（请根据真实引用格式与页码，替换为学校要求的国标格式）",
    ]
    add_bullets(s, 0.85, 1.4, 11.8, 5.4, refs, size=14)

    # ===== 24 Reflection =====
    s = new_slide()
    add_title(s, "十一、感悟")
    add_bullets(
        s, 0.9, 1.5, 11.5, 5.2,
        [
            "从开题到结题，体会到“理论构想”落地为“可演示系统”需要反复迭代。",
            "网站可视化让抽象物理过程变得可感知；手套交互则进一步强化了参与感。",
            "硬件调试中的接线、标定与通信问题，锻炼了排查与文档化习惯。",
            "跨软件与硬件协作，让我更理解系统设计中的接口与闭环思维。",
            "（可补充个人真实故事：一次失败联调、一次成功演示等）",
        ],
        size=16,
    )

    # ===== 25 Thanks =====
    s = new_slide()
    line = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(0.08))
    line.fill.solid()
    line.fill.fore_color.rgb = ACCENT
    line.line.fill.background()
    add_text(s, 0.8, 2.2, 11.5, 0.6, "致谢", size=20, color=ACCENT, align=PP_ALIGN.CENTER)
    add_text(
        s, 1.5, 2.9, 10.3, 2.5,
        "感谢指导教师在选题、方案与答辩准备中的悉心指导！\n感谢实验室同学在网站联调与手套制作中的帮助！\n感谢家人与朋友的支持与鼓励！\n\n敬请各位老师批评指正！",
        size=20, color=WHITE, align=PP_ALIGN.CENTER,
    )

    # ===== 26 Appendix note =====
    s = new_slide()
    add_title(s, "附录：素材替换说明")
    add_bullets(
        s, 0.9, 1.5, 11.5, 5.5,
        [
            "本云端环境无法读取本机 Codex 会话 019f97f6-… 中的开题 PPT。",
            "也无法访问 /Volumes/YIKE_BACKUP/恒星形成模拟器 下的图片资料。",
            "请将开题 PPT 与图片文件夹上传/拷贝到本仓库 assets/photos/ 后告知，可自动嵌图精修。",
            "已生成图示位于 assets/diagrams/：架构、流程、接线、制作与测试流程。",
            "封面姓名、导师、测试数据、参考文献请按实际情况填写。",
        ],
        size=16,
    )

    total = len(built)
    for i, slide in enumerate(built, 1):
        if i == 1 or i == total - 1:
            continue
        if i == total:
            continue
        # skip cover and thanks-ish; still add to most
        add_footer(slide, i, total)

    prs.save(OUT)
    print("saved", OUT)


if __name__ == "__main__":
    build()
