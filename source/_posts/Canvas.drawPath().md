# Canvas.drawPath()

> Path类将多种复合路径（多个轮廓，如直线段、二次曲线、立方曲线）封装在其内部的几何路径。
>
> 也就是说，我们可以使用 drawPath() 来绘制一个多边形或者不规则图形。

下面以等边三角形为例：

```java
// 假设在固定大小内绘制一个等边三角形
private void drawTriangle(Canvas canvas, Paint paint) {
    Path mPath = new Path();
    
    // moveTo 移动到某一点，用于确定下笔坐标
    mPath.moveTo(getWidth() / 2, 0);
    // 连线到某一点，开始绘制，目标点 y 坐标是长直角边的长度
    // 等边三角形，从顶点向下做高，短直角边:斜边:长直角边 = 1:2:√3
    mPath.lineTo(0, getWidth() / 2 * Math.sqrt(3)));
    mPath.lineTo(getWidth(), getWidth() / 2 * Math.sqrt(3)));
    // 闭合多边形，即连线回到起始点，完成绘制
    mPath.close();

    canvas.drawPath(mPath, mPaint);
}
```

