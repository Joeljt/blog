---
thumbnail: https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190321181341.jpg
title: Android 字体变色
tags: [Android]
date: 2018-08-12
---

<!--more-->

> 主要技术点：Canvas.clipRect()

实际上，这个方法可以理解成裁剪画布；

方法接收一个 Rect 对象，而 Rect 对象同样接收左上顶点和右下顶点两个坐标作为参数，用于确认一块区域；

而这块区域，就是接下来将要进行绘制的区域。

通过对画布进行不断的裁剪，同时对左右两侧使用不同颜色的画笔对相同的文字进行绘制，来实现一个文本两种颜色的效果。



```java
@Override
protected void onDraw(Canvas canvas) {

    // 绘制前一半内容
    drawText(canvas, mChangePaint, 0, getWidth()/2);

    // 使用另一颜色的画笔绘制后一半内容
    drawText(canvas, mOriginPaint, getWidth() / 2, getWidth());

}

private void drawText(Canvas canvas, Paint paint, int start, int end) {

    paint.setTextSize(getTextSize());

    // 保存当前画布状态
    canvas.save();

    // 使用 .clipRect() 方法切割画布，然后使用不同颜色的画笔对目标文字进行绘制
    Rect rect = new Rect(start, 0, end, getHeight());
    canvas.clipRect(rect);

    // 获取文字的基本宽高信息
    String text = getText().toString();
    Rect textBounds = new Rect();
    paint.getTextBounds(text, 0, text.length(), textBounds);
    Paint.FontMetricsInt metrics = paint.getFontMetricsInt();

    // 获取起始位置
    int x = getWidth() / 2 - textBounds.width() / 2;
    int y = getHeight() / 2 + (metrics.bottom - metrics.top) / 2 - metrics.bottom;
    canvas.drawText(text, x, y, paint);

    // 清空画布属性，方便接下来绘制变色的部分
    canvas.restore();

}
```