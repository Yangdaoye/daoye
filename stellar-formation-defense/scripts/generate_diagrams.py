#!/usr/bin/env python3
"""Generate wiring diagrams and flowcharts for the defense PPT."""

from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Rectangle
from matplotlib import font_manager

OUT = Path(__file__).resolve().parents[1] / "assets" / "diagrams"
OUT.mkdir(parents=True, exist_ok=True)

FONT = "WenQuanYi Micro Hei"
for candidate in [
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
    "/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf",
]:
    if Path(candidate).exists():
        font_manager.fontManager.addfont(candidate)
        FONT = font_manager.FontProperties(fname=candidate).get_name()
        break

plt.rcParams["font.sans-serif"] = [FONT, "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False

BG = "#0B1B2B"
PANEL = "#132A40"
ACCENT = "#F0B429"
CYAN = "#4EC3D8"
GREEN = "#5CDB95"
PINK = "#F07178"
WHITE = "#F5F7FA"
MUTED = "#A8B8C8"


def new_fig(w=12, h=7):
    fig, ax = plt.subplots(figsize=(w, h), dpi=160)
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis("off")
    return fig, ax


def box(ax, x, y, w, h, text, fc=PANEL, ec=CYAN, fs=11, tw=18):
    patch = FancyBboxPatch(
        (x, y),
        w,
        h,
        boxstyle="round,pad=0.4,rounding_size=1.2",
        linewidth=1.6,
        edgecolor=ec,
        facecolor=fc,
    )
    ax.add_patch(patch)
    ax.text(
        x + w / 2,
        y + h / 2,
        text,
        ha="center",
        va="center",
        color=WHITE,
        fontsize=fs,
        wrap=True,
        linespacing=1.35,
    )
    return patch


def arrow(ax, p1, p2, color=ACCENT):
    ax.annotate(
        "",
        xy=p2,
        xytext=p1,
        arrowprops=dict(arrowstyle="-|>", color=color, lw=1.8, mutation_scale=14),
    )


def title(ax, text):
    ax.text(50, 95, text, ha="center", va="center", color=ACCENT, fontsize=18, fontweight="bold")


def save(fig, name):
    path = OUT / name
    fig.savefig(path, bbox_inches="tight", facecolor=fig.get_facecolor(), pad_inches=0.25)
    plt.close(fig)
    print("wrote", path)


def system_architecture():
    fig, ax = new_fig(12, 7.2)
    title(ax, "系统总体架构")

    box(ax, 6, 62, 22, 18, "智能交互手套\n弯曲 / 姿态传感器\n蓝牙无线传输", ec=PINK)
    box(ax, 39, 62, 22, 18, "主控与通信层\nArduino / ESP32\n串口 / BLE", ec=ACCENT)
    box(ax, 72, 62, 22, 18, "恒星形成模拟网站\n前端可视化 + 后端\n仿真引擎", ec=CYAN)

    box(ax, 6, 28, 22, 16, "数据采集\n手指弯曲 · 手势", ec=MUTED)
    box(ax, 39, 28, 22, 16, "协议解析\n映射手势→指令", ec=MUTED)
    box(ax, 72, 28, 22, 16, "场景交互\n云团坍缩 · 星形成", ec=MUTED)

    arrow(ax, (28, 71), (39, 71))
    arrow(ax, (61, 71), (72, 71))
    arrow(ax, (17, 62), (17, 44), color=CYAN)
    arrow(ax, (50, 62), (50, 44), color=CYAN)
    arrow(ax, (83, 62), (83, 44), color=CYAN)

    box(ax, 22, 6, 56, 12, "人机闭环：手势控制模拟参数 → 网页实时反馈 → 加深对恒星形成过程的理解", fc="#16324A", ec=GREEN, fs=10)
    save(fig, "01_system_architecture.png")


def website_flow():
    fig, ax = new_fig(12, 7)
    title(ax, "网站功能与交互流程")

    steps = [
        (8, 55, "登录 / 进入\n模拟首页"),
        (28, 55, "选择物理\n场景模块"),
        (48, 55, "调节初始\n参数"),
        (68, 55, "启动仿真\n可视化"),
        (88, 55, "手套手势\n实时操控"),
    ]
    for i, (x, y, t) in enumerate(steps):
        box(ax, x - 8, y, 16, 16, t, ec=CYAN if i < 4 else PINK, fs=10)
        if i < len(steps) - 1:
            arrow(ax, (x + 8, y + 8), (steps[i + 1][0] - 8, y + 8))

    modules = [
        (10, 18, "分子云展示"),
        (32, 18, "引力坍缩"),
        (54, 18, "原恒星形成"),
        (76, 18, "反馈与演化"),
    ]
    ax.text(50, 42, "核心功能模块", ha="center", color=ACCENT, fontsize=13)
    for x, y, t in modules:
        box(ax, x, y, 18, 12, t, ec=GREEN, fs=11)
    save(fig, "02_website_flow.png")


def website_dev_process():
    fig, ax = new_fig(12, 6.8)
    title(ax, "网站制作过程")

    items = [
        ("需求梳理", "功能清单\n交互目标"),
        ("界面设计", "页面结构\n视觉风格"),
        ("前端实现", "Three.js /\nCanvas 可视化"),
        ("后端联调", "参数接口\n仿真逻辑"),
        ("手套接入", "手势映射\n实时通信"),
        ("测试上线", "功能验证\n演示优化"),
    ]
    y = 48
    for i, (h, s) in enumerate(items):
        x = 6 + i * 15.5
        box(ax, x, y + 10, 13.5, 10, h, ec=ACCENT, fs=11)
        box(ax, x, y - 8, 13.5, 14, s, ec=CYAN, fs=10)
        if i < len(items) - 1:
            arrow(ax, (x + 13.5, y + 15), (x + 15.5, y + 15))
    ax.text(50, 18, "迭代：原型 → 联调 → 场景完善 → 答辩演示", ha="center", color=MUTED, fontsize=12)
    save(fig, "03_website_dev_process.png")


def wiring_diagram():
    fig, ax = new_fig(12, 7.4)
    title(ax, "智能手套硬件接线图")

    # MCU board
    board = FancyBboxPatch((38, 35), 24, 38, boxstyle="round,pad=0.3,rounding_size=1",
                           linewidth=2, edgecolor=ACCENT, facecolor="#1A3348")
    ax.add_patch(board)
    ax.text(50, 68, "主控板", ha="center", color=ACCENT, fontsize=13, fontweight="bold")
    ax.text(50, 62, "ESP32 / Arduino", ha="center", color=WHITE, fontsize=10)

    pins = [
        (42, 54, "3V3"),
        (42, 48, "GND"),
        (42, 42, "A0~A4"),
        (58, 54, "SDA"),
        (58, 48, "SCL"),
        (58, 42, "TX/RX"),
    ]
    for x, y, t in pins:
        ax.add_patch(Circle((x, y), 1.1, color=CYAN))
        ax.text(x + (3 if x < 50 else -3), y, t, ha="left" if x < 50 else "right",
                va="center", color=WHITE, fontsize=9)

    # Finger flex sensors
    fingers = ["拇指", "食指", "中指", "无名指", "小指"]
    for i, name in enumerate(fingers):
        y = 78 - i * 12
        box(ax, 4, y - 5, 18, 10, f"{name}弯曲传感器\nFlex Sensor", ec=PINK, fs=9)
        ax.plot([22, 38], [y, 50 - i], color=PINK, lw=1.5)
        ax.plot([22, 38], [y - 2, 48], color=MUTED, lw=1.0, linestyle="--")

    # IMU
    box(ax, 74, 62, 22, 16, "九轴姿态模块\nMPU6050 / BNO055\nSDA / SCL", ec=GREEN, fs=10)
    arrow(ax, (74, 70), (62, 54), color=GREEN)
    arrow(ax, (74, 66), (62, 48), color=MUTED)

    # BLE / USB
    box(ax, 74, 28, 22, 14, "无线通信\nBLE / USB 串口\n→ 电脑网站", ec=CYAN, fs=10)
    arrow(ax, (62, 42), (74, 35), color=CYAN)

    # Power
    box(ax, 74, 8, 22, 12, "供电\n3.7V 锂电池 / USB", ec=ACCENT, fs=10)
    arrow(ax, (62, 40), (74, 16), color=ACCENT)

    ax.text(50, 8, "信号线：粉色=模拟弯曲  |  绿色=I2C姿态  |  青色=数据上传",
            ha="center", color=MUTED, fontsize=10)
    save(fig, "04_wiring_diagram.png")


def glove_build_flow():
    fig, ax = new_fig(12, 7)
    title(ax, "互动手套制作流程")

    steps = [
        (12, 60, "1. 选材\n手套基体\n传感器选型"),
        (38, 60, "2. 固定传感\n弯曲条粘贴\n走线规划"),
        (64, 60, "3. 电路组装\n主控焊接\n姿态模块"),
        (88, 60, "4. 供电封装\n电池固定\n外观整理"),
        (25, 22, "5. 固件烧录\n采样与标定"),
        (55, 22, "6. 联调通信\n串口 / BLE"),
        (82, 22, "7. 映射手势\n接入网站"),
    ]
    for i, (x, y, t) in enumerate(steps):
        box(ax, x - 10, y - 8, 20, 18, t, ec=CYAN if i < 4 else GREEN, fs=10)
    arrow(ax, (22, 60), (28, 60))
    arrow(ax, (48, 60), (54, 60))
    arrow(ax, (74, 60), (78, 60))
    arrow(ax, (88, 52), (82, 30), color=ACCENT)
    arrow(ax, (72, 22), (65, 22))
    arrow(ax, (45, 22), (35, 22))
    save(fig, "05_glove_build_flow.png")


def test_flow():
    fig, ax = new_fig(12, 7)
    title(ax, "智能手套功能测试流程")

    box(ax, 8, 55, 18, 16, "硬件自检\n供电 / 接线", ec=ACCENT)
    box(ax, 32, 55, 18, 16, "传感器标定\n弯曲量程", ec=CYAN)
    box(ax, 56, 55, 18, 16, "姿态识别\n手势动作", ec=CYAN)
    box(ax, 80, 55, 18, 16, "通信稳定性\n延迟测量", ec=PINK)

    arrow(ax, (26, 63), (32, 63))
    arrow(ax, (50, 63), (56, 63))
    arrow(ax, (74, 63), (80, 63))

    box(ax, 14, 18, 28, 20, "单项测试\n· 单指弯曲响应\n· 握拳 / 张开\n· 旋转姿态", ec=GREEN, fs=10)
    box(ax, 52, 18, 34, 20, "联调测试\n· 手势 → 网站参数变化\n· 场景切换是否正确\n· 连续操作流畅度", ec=GREEN, fs=10)
    arrow(ax, (41, 55), (28, 38), color=MUTED)
    arrow(ax, (74, 55), (69, 38), color=MUTED)
    save(fig, "06_test_flow.png")


def overall_roadmap():
    fig, ax = new_fig(12, 6.5)
    title(ax, "课题实施技术路线")

    phases = [
        ("开题阶段", "文献调研\n方案设计\n目标确认", ACCENT),
        ("网站建设", "界面与仿真\n功能模块\n过程记录", CYAN),
        ("手套研制", "硬件接线\n固件开发\n工艺制作", PINK),
        ("系统联调", "通信映射\n功能测试\n问题迭代", GREEN),
        ("结题答辩", "成果整理\nPPT / 演示\n总结展望", ACCENT),
    ]
    for i, (h, b, c) in enumerate(phases):
        x = 5 + i * 19
        box(ax, x, 48, 16, 12, h, ec=c, fs=12)
        box(ax, x, 22, 16, 20, b, ec=MUTED, fs=10)
        if i < len(phases) - 1:
            arrow(ax, (x + 16, 54), (x + 19, 54), color=c)
    save(fig, "07_overall_roadmap.png")


if __name__ == "__main__":
    system_architecture()
    website_flow()
    website_dev_process()
    wiring_diagram()
    glove_build_flow()
    test_flow()
    overall_roadmap()
    print("all diagrams done →", OUT)
