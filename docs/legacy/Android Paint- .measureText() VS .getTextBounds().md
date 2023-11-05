---
title: Android Paint .measureText() VS .getTextBounds()

Tags: android

date: 2018-03-29
---



两个方法可以用来测量文字宽高信息的，只不过 **.getTextBounds()** 还可以获得高度信息，因为其使用一个 Rect 对象对宽高信息进行存储；而 **.measureText()** 则只是返回宽度信息。

<!--more-->

具体使用方法如下：

```java
final String someText = "Hello. I'm some text!";

Paint mPaint = new Paint();

// .measureText()
float measuredWidth = mPaint.measureText(someText);

// .getTextBounds()
Rect mBounds = new Rect();
mPaint.getTextBounds(someText, 0, someText.length, mBounds);
int measuredWidth = mBounds.width();
int measuredHeight = mBounds.height();

```

但是，当我们把两个结果打印出来，我们会发现，对于同一个文本信息，使用两个方法得到的宽度是不同的：

```java
// 打印宽度信息
Log.d("Test", String.format(
        "Text is '%s', measureText %f, getTextBounds %d",
        someText,
        measuredWidth,
        mBounds.width())
    );

// 打印结果如下
// Text is 'Hello. I'm some text!', measureText 115.000000, getTextBounds 105
```



经过一系列的探究和资料查看，最后得到的结论是：

> 二者返回结果确实不同，且 measureText() 返回结果会略微大于 getTextBounds() 所得到的宽度信息
>
> measureText() 会在文本的左右两侧加上一些额外的宽度，这部分额外的宽度叫做 Glyph's AdvanceX （具体应该是属于字型方面的范畴，我猜测这部分宽度是类似字间距之类的东西）
>
> getTextBounds() 返回的则是当前文本所需要的最小宽度，也就是整个文本外切矩形的宽度



实际上，这两个方法在具体调用时虽然都是不同的方法，但在 native 层的测量算法都是一致的，只不过在最后返回时，measureText() 会在左右两侧加上一些额外的宽度值，而 getTextBounds() 则是返回需要的最小宽度而已。

