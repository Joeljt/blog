---
thumbnail: https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190410195304.jpg
title: MeasureSpec 那点事儿
tags: [Android]
date: 2019-04-10
---







在自定义 View 的学习过程中，不管怎么样都绕不过 MeasureSpec  的学习；拖拖拉拉很久，在数不清的看了忘，忘了看之后，还是决定写篇博客记录一下，毕竟有效的输出才是检验输入的不二法门。



<!-- more -->

废话不多说，下面进入正题。



### MeasureSpec 定义

关于 MeasureSpec 的定义，官方解释如下：

> A MeasureSpec encapsulates the layout requirements passed from parent to child. Each MeasureSpec represents a requirement for either the width or the height. 

大意就是，MeasureSpec 封装了父布局传递给子布局的布局要求，每个 MeasureSpec 由 `mode` 和 `size` 组成，包含了父布局对子布局相应的宽高要求。

MeasureSpec 有三种模式：UNSPECIFIED、EXACTLY、AT_MOST。

- UNSPECIFIED

  父布局不对子布局做任何限制，它想多大就多大；一般自定义 View 中用不到；

  > 常见于系统内部控件，例如 ListView、ScrollView

- EXACTLY

  父布局对子布局的宽高大小有明确的要求，不管子布局想要多大，它都不能超过父布局对它的限制；

  > 指定的大小如 100dp，或者 match_parent(实质上就是屏幕大小)，都是确切的尺寸

- AT_MOST

  子布局想要多大就可以多大，但是一般来说不会超过父布局的尺寸；

  > 一般对应的父布局尺寸为 wrap_content，父布局无法确定子布局的尺寸

为了节约内存占用，MeasureSpec 本身就是一个 32 位的 int 值，这个类就是负责将 <size, mode> 的元组转换为 int 值，高 2 位表示 specMode，低 30 位表示 specSize。



**一个 View 的大小并不是由它自己确定的，而是由其自身的 LayoutParams 以及父布局的 MeasureSpec 确定的。**

那 MeasureSpec 是什么，最初的 MeasureSpec 又是哪里来的？



### MeasureSpec 缘起

由于 View 的绘制流程入口在 ViewRootImpl 类中，我们最终在 performTraversals 方法中找到如下代码：

```java
    int childWidthMeasureSpec = getRootMeasureSpec(mWidth, lp.width);
 		int childHeightMeasureSpec = getRootMeasureSpec(mHeight, lp.height);
 		// Ask host how big it wants to be
 		performMeasure(childWidthMeasureSpec, childHeightMeasureSpec);
```

很明显在执行测量的最初，系统是通过 `getRootMeasureSpec` 方法获取到宽高的 MeasureSpec 信息的。

```java
private static int getRootMeasureSpec(int windowSize, int rootDimension) {
    int measureSpec;
    switch (rootDimension) {
        case ViewGroup.LayoutParams.MATCH_PARENT:
            // Window can't resize. Force root view to be windowSize.
            measureSpec = MeasureSpec.makeMeasureSpec(windowSize, MeasureSpec.EXACTLY);
            break;
        case ViewGroup.LayoutParams.WRAP_CONTENT:
            // Window can resize. Set max size for root view.
            measureSpec = MeasureSpec.makeMeasureSpec(windowSize, MeasureSpec.AT_MOST);
            break;
        default:
            // Window wants to be an exact size. Force root view to be that size.
            measureSpec = MeasureSpec.makeMeasureSpec(rootDimension, MeasureSpec.EXACTLY);
            break;
    }
    return measureSpec;
}
```

很明显，通过这个方法我们可以发现，在 View 测量的入口，specSize 是固定的 windowSize，而 MATCH_PARENT 对应的测量模式是 EXACTLY，WRAP_CONTENT 对应的测量模式是 AT_MOST。我们会发现，每个 MeasureSpec 都是通过 `MeasureSpec.makeMeasureSpec` 生成的。

SpecMode 和 SpecSize 组成了 MeasureSpec，MeasureSpec 通过将 SpecMode 和 SpecSize 打包成一个 int 值来避免过多的对象创建，并提供了对应的打包、解包方法：

```java
public static int makeMeasureSpec(int size, int mode) {
    if (sUseBrokenMakeMeasureSpec) {
        // 二进制的 + ，不是十进制
      	// 使用一个32位的二进制数，其中：32和31位代表测量模式（mode）、后30位代表测量大小（size）
        // 例如size=100(就是十进制的 4)，mode=AT_MOST，measureSpec=100+1000...00=1000..00100  
        return size + mode;
    } else {
        return (size & ~MODE_MASK) | (mode & MODE_MASK);
    }
}

public static int getMode(int measureSpec) {
  	// MODE_MASK = 运算遮罩 = 11 00000000000(11后跟30个0)
  	// 原理：保留measureSpec的高2位（即测量模式）、使用0替换后30位
    return (measureSpec & MODE_MASK);
}

public static int getSize(int measureSpec) {
    // 原理：同上，将 MASK 取反，得到 00 1111111111(00后跟30个1) 
    // 将 32,31 替换成 0 也就是去掉了 mode，只保留后30位的size
    return (measureSpec & ~MODE_MASK);
}
```

现在我们得到了 MeasureSpec，现在来看看父布局是怎么通过 MeasureSpec 支配子布局的。

以下代码截取自 LinearLayout 的 measureVertical 方法：

```java
final LayoutParams lp = (LayoutParams) child.getLayoutParams();
final int childWidthMeasureSpec = MeasureSpec.makeMeasureSpec(
        Math.max(0, childWidth), MeasureSpec.EXACTLY);
final int childHeightMeasureSpec = getChildMeasureSpec(heightMeasureSpec,
        mPaddingTop + mPaddingBottom + lp.topMargin + lp.bottomMargin,
        lp.height);
// 传到各个子 View 的 MeasureSpec 就是在这里生成的
child.measure(childWidthMeasureSpec, childHeightMeasureSpec);
```

我们可以发现，由于是测量竖直方向的线性布局，布局的宽度是固定的，所以直接调用 MeasureSpec 生成宽度的规格，同时为其指定测量模式为 MeasureSpec.EXACTLY；高度因为比较复杂，调用了 `getChildMeasureSpec` 生成，传入了当前 LinearLayout 的父布局为其指定的 MeasureSpec 以及当前子 View 的 LayoutParams：

```java
/**
 * ViewGroup#getChildMeasureSpec
 * 
 * @param spec 父布局的 MeasureSpec
 * @param padding 子布局的 margin+padding
 * @param childDimension 子布局的高度信息，lp.height
 * @return
 */
public static int getChildMeasureSpec(int spec, int padding, int childDimension) {
  	// 获取父布局，也就是 LinearLayout 的测量模式以及测量大小
    int specMode = MeasureSpec.getMode(spec);
    int specSize = MeasureSpec.getSize(spec);

  	// 记录一下除去 padding 的测量大小，但是不一定会用，具体要看父布局的 mode 以及子布局自身的 size 
    int size = Math.max(0, specSize - padding);

  	// 当前 child 的 size 和 mode
    int resultSize = 0;
    int resultMode = 0;

    // 判断一下父布局的测量规格，看看是 match 还是 wrap
    switch (specMode) {
        // 如果是 EXACTLY，说明父布局是有固定大小的，或者是定死的 100dp，或者是 match_parent 的屏幕宽度
        case MeasureSpec.EXACTLY: // 值为 -2
        		// 在这种情况下，如果子布局的高度信息是有确定值的，那说明用户声明了固定的 100dp 等信息
         		// 那就让子布局的宽高信息固定，同时设置测量模式同样为 EXACTLY
            if (childDimension >= 0) {
                resultSize = childDimension;
                resultMode = MeasureSpec.EXACTLY;
            } else if (childDimension == ViewGroup.LayoutParams.MATCH_PARENT) {
                // 如果子布局想要充满父布局，那就让它和父布局一样大，然后设置测量模式同样为 EXACTLY
                resultSize = size;
                resultMode = MeasureSpec.EXACTLY;
            } else if (childDimension == ViewGroup.LayoutParams.WRAP_CONTENT) {
                // 子布局想自己决定自己的大小，但是它最大不能超过父布局，所以模式是 AT_MOST
                resultSize = size;
                resultMode = MeasureSpec.AT_MOST;
            }
            break;

        // 如果是 AT_MOST，说明父布局是包裹内容，那子布局不能超过父布局的大小
        case MeasureSpec.AT_MOST:
            if (childDimension >= 0) {
                // 全部同上
                resultSize = childDimension;
                resultMode = MeasureSpec.EXACTLY;
            } else if (childDimension == ViewGroup.LayoutParams.MATCH_PARENT) {
              	// 父布局都不知道自己的大小，只能告诉子布局最大不能超过自己，所以模式只能是 AT_MOST
                resultSize = size;
                resultMode = MeasureSpec.AT_MOST;
            } else if (childDimension == ViewGroup.LayoutParams.WRAP_CONTENT) {
                resultSize = size;
                resultMode = MeasureSpec.AT_MOST;
            }
            break;

        // 父布局不对子布局做任何限制，想多大多大，一般多见于ListView、GridView
        case MeasureSpec.UNSPECIFIED:
            if (childDimension >= 0) {
                // Child wants a specific size... let him have it
                resultSize = childDimension;
                resultMode = MeasureSpec.EXACTLY;
            } else if (childDimension == ViewGroup.LayoutParams.MATCH_PARENT) {
                // Child wants to be our size... find out how big it should
                // be
                resultSize = View.sUseZeroUnspecifiedMeasureSpec ? 0 : size;
                resultMode = MeasureSpec.UNSPECIFIED;
            } else if (childDimension == ViewGroup.LayoutParams.WRAP_CONTENT) {
                // Child wants to determine its own size.... find out how
                // big it should be
                resultSize = View.sUseZeroUnspecifiedMeasureSpec ? 0 : size;
                resultMode = MeasureSpec.UNSPECIFIED;
            }
            break;
    }
    // 用父布局的 MeasureSpec 和 child 的 lp，为其生成自己的测量规格
    return MeasureSpec.makeMeasureSpec(resultSize, resultMode);
}
```



### 做个小总结

说到这里，大家也应该能理解「一个 View 的大小是由它的父布局和它自身共同决定的」是什么意思了。

这里简单做个总结：

1. MeasureSpec 的 UNSPECIFIED 测量模式一般见于系统内部，并不多见，不做过多讨论，目前已知的应用就是 ScrollView 嵌套 ListView 只能显示一行，就是由于 ScrollView 在测量子 View 的时候，向下传递的测量模式为 MeasureSpec.UNSPECIFIED ，同时 ListView 的 onMeasure 方法是这样的：

   ```java
   // 如果测量模式为 MeasureSpec.UNSPECIFIED，则最终的高度就是已测量的高度 + padding
   if (heightMode == MeasureSpec.UNSPECIFIED) {
      	heightSize = mListPadding.top + mListPadding.bottom + 
        		childHeight + getVerticalFadingEdgeLength() * 2;
   }
   ```

   这就导致了最终 ListView 的高度只有一行，感兴趣的可以看一下[ScrollView 嵌套 ListView 的解决方法的原理](<https://www.jianshu.com/p/061f734af3e9>)，这里就不再过多介绍了；

2. **当子 View 设置了固定值的时候，无论父布局的测量模式是什么，*<u>子 View 的大小都遵循这个固定值，</u>*<u>*即使超出屏幕*</u>，且测量模式都为精确模式，即 MeasureSpec.EXACTLY**；

3. **当子 View 为 match_parent 时，其 specMode 跟随父布局的 specMode**，*<u>父布局固定，那你充满父布局，你肯定也固定，就是 EXACTLY；父布局包裹内容，不能确定自己多大，那你肯定也不能知道自己多大，那就 AT_MOST</u>*；**其 specSize 也就是父布局的 size，不会超过父布局的大小；**

4. **当子 View 为 wrap_content 时，那它的 specMode 是 AT_MOST，specSize 就是父布局的 size，因为虽然其不能确定宽高，但是始终不能超过父布局的大小。**



### 🌰

一直贴代码，说理论多少有点枯燥，贴点图片，看看🌰

#### 父布局为 EXACTLY

1. ViewGroup: match_parent, Child: 500dp x 500dp

2. ViewGroup: 300dp x 300dp, Child: 500dp x 500dp

   > 父布局测量规格是精确模式，测量大小是屏幕大小；
   >
   > 子 View 设置为固定值，忽视父布局的测量规格，大小就是设置的宽高，测量模式为精确模式

   ```java
   // 布局如下
   <com.ljt.rvanalysis.spec.MyLinearLayout
       android:layout_width="match_parent"
       android:layout_height="match_parent"
       android:orientation="vertical">
   
       <com.ljt.rvanalysis.spec.MyTextView
           android:layout_width="300dp"
           android:layout_height="300dp" />
   
   </com.ljt.rvanalysis.spec.MyLinearLayout>
   ```

   ![](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190410180646.png)

3. ViewGroup: match_parent, child: match_parent

   > 父布局、子布局均充满屏幕，测量模式都为 MeasureSpec.EXACTLY，测量大小均为屏幕大小

   ```JAVA
   <com.ljt.rvanalysis.spec.MyLinearLayout
       android:layout_width="match_parent"
       android:layout_height="match_parent"
       android:orientation="vertical">
   
       <com.ljt.rvanalysis.spec.MyTextView
           android:layout_width="match_parent"
           android:layout_height="match_parent" />
   
   </com.ljt.rvanalysis.spec.MyLinearLayout>
   ```

   ![](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190410180825.png)

4. ViewGroup: match_parent, child: wrap_content

   > 父布局充满屏幕，测量模式是精确模式，测量大小是屏幕大小；
   >
   > 子布局包裹内容，测量模式是 AT_MOST，但是不能超过父布局，测量大小为屏幕大小

   ```java
   <com.ljt.rvanalysis.spec.MyLinearLayout
       android:layout_width="match_parent"
       android:layout_height="match_parent"
       android:orientation="vertical">
   
       <com.ljt.rvanalysis.spec.MyTextView
           android:layout_width="wrap_content"
           android:layout_height="wrap_content" />
   
   </com.ljt.rvanalysis.spec.MyLinearLayout>
   ```

   ![](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190410180934.png)



#### 父布局为 WRAP_CONTENT

1. ViewGroup: wrap_content, child: match_parent

   > 父布局测量规格是 AT_MOST，测量大小是屏幕大小；
   >
   > 子布局测量规格 AT_MOST，但是无法超过父布局大小，测量大小也是屏幕大小；

   ```java
   <com.ljt.rvanalysis.spec.MyLinearLayout
       android:layout_width="wrap_content"
       android:layout_height="wrap_content"
       android:orientation="vertical">
   
       <com.ljt.rvanalysis.spec.MyTextView
           android:layout_width="match_parent"
           android:layout_height="match_parent" />
   
   </com.ljt.rvanalysis.spec.MyLinearLayout>
   ```

   ![](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190410181341.png)

2. ViewGroup: wrap_content, child: 300dp x 300dp

   > 父布局测量规格是 AT_MOST，测量大小是屏幕大小；
   >
   > 子 View 设置为固定值，忽视父布局的测量规格，大小就是设置的宽高，测量模式为精确模式

   ```java
   <com.ljt.rvanalysis.spec.MyLinearLayout
       android:layout_width="wrap_content"
       android:layout_height="wrap_content"
       android:orientation="vertical">
   
       <com.ljt.rvanalysis.spec.MyTextView
           android:layout_width="300dp"
           android:layout_height="300dp" />
   
   </com.ljt.rvanalysis.spec.MyLinearLayout>
   ```

   ![](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190410181429.png)

3. ViewGroup: wrap_content, child: wrap_content

   > 父布局测量规格是 AT_MOST，测量大小是屏幕大小；
   >
   > 子布局也不知道自己多大，测量规格是 AT_MOST，不能超过父布局，测量大小是屏幕大小；

   ```java
   <com.ljt.rvanalysis.spec.MyLinearLayout
       android:layout_width="wrap_content"
       android:layout_height="wrap_content"
       android:orientation="vertical">
   
       <com.ljt.rvanalysis.spec.MyTextView
           android:layout_width="wrap_content"
           android:layout_height="wrap_content" />
   
   </com.ljt.rvanalysis.spec.MyLinearLayout>
   ```

   ![](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190410181519.png)

