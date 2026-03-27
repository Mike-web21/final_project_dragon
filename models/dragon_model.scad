
// Chinese Dragon - Export Switch Version

$fn = 60;


// 导出开关
SHOW_HEAD = true;
SHOW_BODY = true;
SHOW_FRONT_LEGS = true;
SHOW_BACK_LEGS = true;

// 整体颜色与朝向
color("Gold") {
    rotate([0, -10, 0]) {
        translate([80, 0, 0]) {
            chinese_dragon();
        }
    }
}

// 身体曲线函数（身体和腿共用）
function body_y(x) = 25 * sin(x * 2.5);
function body_z(x) = 15 * sin(x * 1.5);
function body_r(x) = max(4, 10 - ((-x) / 30));

// 主模型组装
module chinese_dragon() {
    if (SHOW_HEAD)
        translate([0, 0, 0]) dragon_head();

    if (SHOW_BODY)
        translate([-15, 0, -5]) dragon_body();

    if (SHOW_FRONT_LEGS) {
        attached_leg_on_curve(-20,  1, true);   // 前左
        attached_leg_on_curve(-20, -1, true);   // 前右
    }

    if (SHOW_BACK_LEGS) {
        attached_leg_on_curve(-95,  1, false);  // 后左
        attached_leg_on_curve(-95, -1, false);  // 后右
    }
}

// 头部
module dragon_head() {
    union() {
        // 吻部
        scale([1.8, 1, 0.8]) sphere(r=10);

        // 后脑
        translate([-12, 0, 6]) sphere(r=12);

        // 眉骨
        translate([-5, 7, 9]) sphere(r=4);
        translate([-5, -7, 9]) sphere(r=4);

        // 眼球
        translate([-2, 8, 11]) sphere(r=1.5);
        translate([-2, -8, 11]) sphere(r=1.5);

        // 龙角
        translate([-12, 7, 15]) rotate([0, -30, 20]) dragon_horn();
        translate([-12, -7, 15]) rotate([0, -30, -20]) dragon_horn();

        // 龙须
        translate([12, 8, -2]) rotate([-10, 45, 30]) cylinder(h=30, r1=1.5, r2=0.1);
        translate([12, -8, -2]) rotate([10, 45, -30]) cylinder(h=30, r1=1.5, r2=0.1);

        // 鼻孔区域
        translate([15, 3, 3]) sphere(r=2);
        translate([15, -3, 3]) sphere(r=2);
    }
}

// 分叉龙角
module dragon_horn() {
    union() {
        cylinder(h=25, r1=2.5, r2=0.5);

        translate([0, 0, 8])
            rotate([40, 0, 0])
                cylinder(h=12, r1=1.5, r2=0.2);

        translate([0, 0, 15])
            rotate([-30, 20, 0])
                cylinder(h=10, r1=1, r2=0.1);
    }
}

// 身体段：球与球 hull 平滑连接
module bezier_dragon_segment(start, end, radius1, radius2) {
    hull() {
        translate(start) sphere(r=radius1);
        translate(end) sphere(r=radius2);
    }
}

// 身体
module dragon_body() {
    steps = 160;
    delta_x = 8;

    for (i = [0 : delta_x : steps - delta_x]) {
        p1_x = -i;
        p1 = [p1_x, body_y(p1_x), body_z(p1_x)];

        p2_x = -(i + delta_x);
        p2 = [p2_x, body_y(p2_x), body_z(p2_x)];

        r1 = 10 - (i / 30);
        r2 = 10 - ((i + delta_x) / 30);

        bezier_dragon_segment(p1, p2, r1, r2);

        // 背刺
        translate([p1_x, body_y(p1_x), body_z(p1_x) + 8 - (i/30)])
            rotate([0, -20, 0])
                cylinder(h=10, r1=2, r2=0);
    }

    // 尾巴尖端
    last_x = -steps;
    translate([last_x, body_y(last_x), body_z(last_x)])
        rotate([0, -45, 0])
            cylinder(h=15, r1=4, r2=0);
}

// 腿绑定到身体曲线
module attached_leg_on_curve(x_body, side, is_front=true) {
    // 身体整体偏移
    body_offset = [-15, 0, -5];

    // 身体在该 x 的中心点
    cx = x_body + body_offset[0];
    cy = body_y(x_body) + body_offset[1];
    cz = body_z(x_body) + body_offset[2];

    // 身体半径
    r = body_r(x_body);

    // 左右偏移
    side_offset = r * 0.72 * side;

    // 腿根点
    leg_joint = [
        cx + (is_front ? 2 : -2),
        cy + side_offset,
        cz - r * 0.78
    ];

    // 身体连接参考点
    body_joint_1 = [
        cx - 2,
        cy + side * r * 0.38,
        cz - r * 0.10
    ];

    body_joint_2 = [
        cx + 2,
        cy + side * r * 0.28,
        cz - r * 0.35
    ];

    leg_rot_y = is_front ? 18 : -12;

    union() {
        // 主连接块
        hull() {
            translate(body_joint_1)
                scale([1.8, 0.80, 0.70]) sphere(r = r * 0.34);

            translate(leg_joint)
                scale([1.00, 0.90, 1.15]) sphere(r = r * 0.26);
        }

        // 次连接块
        hull() {
            translate(body_joint_2)
                scale([1.5, 0.75, 0.62]) sphere(r = r * 0.28);

            translate([
                leg_joint[0] + (is_front ? 1.5 : -1.5),
                leg_joint[1],
                leg_joint[2] - 1.0
            ])
                scale([0.95, 0.78, 1.05]) sphere(r = r * 0.22);
        }

        // 腿本体
        if (side > 0)
            translate(leg_joint)
                rotate([0, leg_rot_y, 0])
                    dragon_leg(is_front);
        else
            translate(leg_joint)
                mirror([0,1,0])
                    rotate([0, leg_rot_y, 0])
                        dragon_leg(is_front);
    }
}

// 腿
module dragon_leg(is_front=true) {
    upper_len = is_front ? 10 : 11;
    lower_len = is_front ? 12 : 13;
    foot_z    = is_front ? -24 : -25;

    union() {
        // 腿根
        scale([1.05, 0.95, 1.15]) sphere(r=2.7);

        // 大腿 / 上肢
        hull() {
            translate([0, 0, 0]) sphere(r=2.7);
            translate([2.5, 4.0, -upper_len]) sphere(r=2.3);
        }

        // 小腿 / 下肢
        hull() {
            translate([2.5, 4.0, -upper_len]) sphere(r=2.1);
            translate([1.0, 8.0, -(upper_len + lower_len)]) sphere(r=1.7);
        }

        // 脚掌
        translate([1.0, 9.0, foot_z])
            scale([1.35, 1.0, 0.65]) sphere(r=2.4);

        // 爪子
        translate([1.0, 9.0, foot_z]) {
            rotate([8, 28, 8]) cylinder(h=7.0, r1=0.72, r2=0);
            rotate([5, -28, -8]) cylinder(h=7.0, r1=0.72, r2=0);
            rotate([32, 0, 0]) cylinder(h=6.6, r1=0.68, r2=0);
            rotate([-35, 0, 0]) cylinder(h=4.2, r1=0.52, r2=0);
        }
    }
}