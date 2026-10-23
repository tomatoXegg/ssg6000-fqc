export const SECTIONS = [
  { key: 'prep', index: '01', title: '检验准备与工位环境规范',
    note: '严禁徒手触摸后盖板金属面；机身后部留足接线余量，禁止死折射频线缆。',
    items: [
      { key: 'prep.osc-main', label: '主测示波器 SDS5000X 通电开机，后面板 USB 与工控测试电脑连接稳定' },
      { key: 'prep.osc-aux', label: '辅助示波器 SDS1054X 保持关机断电，若开机必须拔除后部 USB 线' },
      { key: 'prep.fixtures', label: '工装治具齐全：专用选件 U 盘、普通 U 盘、射频黑色胶帽、提手防拆封签' },
    ] },
  { key: 'bom', index: '02', title: '第一阶段：系统信息与 BOM 结构核查（工单比对）',
    note: '工单投老料却装新款后盖板时，必须查工单「生产备注」的代用批准，无说明不得放行。',
    items: [
      { key: 'bom.cloud-scan', label: '鼎阳云平台扫码调出生产信息（品质检查 → 整机工序检查 → 样机查询）' },
      { key: 'bom.mes-workorder', label: '数磊 MES 按工单查询 BOM 与物料图纸' },
      { key: 'bom.rear-cover', label: '新老后盖板辨识：老款 1 个 U 型孔，新款 2 个 U 型孔，与工单投料一致' },
      { key: 'bom.sn-id', label: 'SN 与硬件 ID 比对，机身 ID 与云平台 100% 吻合' },
    ] },
  { key: 'mech', index: '03', title: '第二阶段：静态外观与机械结构检查（断电状态）',
    note: '本节在整机断电状态下完成。',
    items: [
      { key: 'mech.screws', label: '18 颗固定螺丝齐全锁紧，后盖板无手印氧化' },
      { key: 'mech.front-panel', label: '前面板丝印清晰无断线无划痕，面膜贴合平整无气泡翘边' },
      { key: 'mech.feet', label: '四个脚垫螺栓紧固，桌面放置平稳无晃动' },
      { key: 'mech.connectors', label: 'BNC/SMA 螺母拧紧，接地端子锁紧且打扣到位' },
      { key: 'mech.power-switch', label: '开关按键圆点（○）朝向符合标准色图' },
      { key: 'mech.fan-ocxo', label: '风扇网罩铆钉冲压平整，A 系列标配 OCXO 在位' },
    ] },
  { key: 'script', index: '04', title: '第三阶段：自动化脚本性能测试（网络配置与核心避坑）',
    note: '脚本只走 LAN，网口统一锁死 10.11.20.155；全选测试项后必须取消勾选【网口设置 / LAN Test】。',
    items: [
      { key: 'script.static-ip', label: '待测机静态 IP 设为 10.11.20.155 / 255.255.255.0 / 网关 10.11.20.1，DHCP 关闭' },
      { key: 'script.lan-unchecked', label: '脚本全选测试项后取消勾选【网口设置 / LAN Test】，防通信中断' },
      { key: 'script.ref-mod', label: '按拓扑接 SDG6052 与示波器 CH1，完成 10MHz 外参考与外部调制换线测试' },
      { key: 'script.known-bugs', label: 'U 盘 3 个挂载图标正常，外调制时序偶发不过已确认放行' },
    ] },
  { key: 'files', index: '05', title: '第四阶段：出厂文件清理与底层配置校准',
    note: '交付波形目录 82A-1/IQ 必须 8 个文件，容量锁定 261.77 MB。',
    items: [
      { key: 'files.boot-count', label: '重置开机次数，确认调试临时垃圾文件已联动清空' },
      { key: 'files.snapshots', label: '确认自动生成的系统快照配置文件属正常现象' },
      { key: 'files.wave-count', label: '82A-1/IQ 交付波形目录文件数为 8 个' },
      { key: 'files.wave-size', label: '波形文件夹容量为 261.77 MB' },
    ] },
  { key: 'option', index: '06', title: '第五阶段：选件授权、出厂复位与硬件自检',
    note: '专用选件 U 盘插入后必须满 60 秒再拔出。',
    items: [
      { key: 'option.factory-reset', label: '执行 Factory Reset，复位后检查网口状态' },
      { key: 'option.language-screensaver', label: '系统语言设为 English，屏保 10s 验证后关闭' },
      { key: 'option.autostart-clock', label: '关闭通电自动开机，系统时钟与北京时间误差在 ±5 分钟内' },
      { key: 'option.logs-mac', label: 'Log List 全部清空，以太网 MAC 地址芯片正常（尾号 74）' },
      { key: 'option.led-keys', label: 'LED Test 的 Mod/RF 灯变色点亮，Key Test 全键通过' },
      { key: 'option.board-fan', label: 'Board Test 全部 Pass，后侧风扇正常运转出风' },
    ] },
  { key: 'pack', index: '07', title: '第六阶段：外观防护、包装与系统过站流程',
    note: '所有暴露射频头与 BNC 口套黑色胶帽，提手左侧贴防拆易碎标签。',
    items: [
      { key: 'pack.caps-seal', label: '所有暴露射频头与 BNC 口套黑色橡胶保护帽，提手左侧贴防拆易碎标签' },
      { key: 'pack.qcs', label: '数磊 QCS 过站：FQC 检验 → 扫描 LPN → 全选项目 → 批量合格 → 审核确认' },
      { key: 'pack.cloud-form', label: '8S 扣机挂载成功，鼎阳云平台填报电子出厂检查单并留存版本' },
    ] },
];

export const TOTAL_ITEMS = SECTIONS.reduce((total, section) => total + section.items.length, 0);

export const ITEM_KEYS = SECTIONS.flatMap((section) => section.items.map((item) => item.key));

const ITEM_INDEX = new Map();
for (const section of SECTIONS) {
  for (const item of section.items) {
    ITEM_INDEX.set(item.key, { ...item, sectionKey: section.key });
  }
}

export function findItem(key) {
  return ITEM_INDEX.get(key) ?? null;
}
