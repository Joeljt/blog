---
title: 自定义 TextView

tags: android 

date: 2018-03-07
---



### 构造方法

- 一个参数

  在代码中初始化时使用

- 两个参数

  在布局文件中使用时，会经过这个方法；第二个参数 **attrs** 就是传入的自定义属性

- 三个参数

  同样是在布局文件中使用，但是当文件中使用到 style 文件时才会使用，第三个参数是 style 文件

### 测量规格

MeasureSpec 是一个 32 位的 int 值，前 2 位表示 SpecMode，后 30 位表示 SpecSize。

MeasureSpec 通过将 SpecMode 和 SpecSize 打包成一个 int 值来避免过多的对象内存分配，同样在使用到具体的属性时，可以通过解包的方式来获取原始值。

```
 @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        // 具体在测量控件大小时，宽高的 MeasureSpec 都是由父布局一层层传递下来的
        // MeasureSpec 可以理解为是父 View 对子 View 的的测量要求
        super.onMeasure(widthMeasureSpec, heightMeasureSpec);
    }

```

- MeasureSpec 的三种情况

  - AT_MOST

    父容器指定了一个可用大小，即 SpecSize，当前子 View 大小不能超过这个值

    对应布局文件中的 wrap_content

  - EXACTLY

    父容器已经测量出 View 所需要的精确大小，子 View 最终的大小就是测量到的值

    对应布局文件中的 match_parent 或者固定数值

  - UNSECIFIED

    一般系统的控件才会使用到这个，自己自定义 View 的话，很少用到

- ScrollView 嵌套 ListView 的解决方法的原理

  ```
  public class ListViewForScrollView extends ListView {
      public ListViewForScrollView(Context context) {
          super(context);
      }
      public ListViewForScrollView(Context context, AttributeSet attrs) {
          super(context, attrs);
      }
      public ListViewForScrollView(Context context, AttributeSet attrs,
          int defStyle) {
          super(context, attrs, defStyle);
      }
          
      @Override
      /**
       * 重写该方法，达到使ListView适应ScrollView的效果
       */
      protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
          // 打包方法，重新构造 heightMeasureSpec
          int expandSpec = MeasureSpec.makeMeasureSpec(Integer.MAX_VALUE >> 2,
          MeasureSpec.AT_MOST);
          super.onMeasure(widthMeasureSpec, expandSpec);
      }
  }

  ```

  我们知道，Android 的测绘机制是一个递归的流程，从最顶层的开始，依次递归向下测量子 View ，即调用 measureChild() 方法，一层层测量后，最后再测量最外层的 ViewGroup .

  查看 ScrollView 的源码：

  ```
  @Override
      protected void measureChild(View child, int parentWidthMeasureSpec,
              int parentHeightMeasureSpec) {
          ViewGroup.LayoutParams lp = child.getLayoutParams();

          int childWidthMeasureSpec;
          int childHeightMeasureSpec;

          childWidthMeasureSpec = getChildMeasureSpec(parentWidthMeasureSpec, mPaddingLeft
                  + mPaddingRight, lp.width);
          final int verticalPadding = mPaddingTop + mPaddingBottom;
          
          // ScrollView 在具体测量子 View 时，向下传递的测量规格为 MeasureSpec.UNSPECIFIED
          childHeightMeasureSpec = MeasureSpec.makeSafeMeasureSpec(
                  Math.max(0, MeasureSpec.getSize(parentHeightMeasureSpec) - verticalPadding),
                  MeasureSpec.UNSPECIFIED);

          child.measure(childWidthMeasureSpec, childHeightMeasureSpec);
      }

  ```

  理论上讲，这时候代码会走到 ListView 的 onMeasure() 方法中：

  ```
  @Override
      protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
          super.onMeasure(widthMeasureSpec, heightMeasureSpec);

          final int heightMode = MeasureSpec.getMode(heightMeasureSpec);
          int heightSize = MeasureSpec.getSize(heightMeasureSpec);

          int childHeight = 0;
         
          ... ...
          
          // 获取 ListView 的高度，此时应该只有一个条目的高度
          childHeight = child.getMeasuredHeight();

       	... ...

          // 重点就在这里
          // 如果测量模式为 MeasureSpec.UNSPECIFIED，则最终的高度就是已测量的高度 + padding
          if (heightMode == MeasureSpec.UNSPECIFIED) {
              heightSize = mListPadding.top + mListPadding.bottom + childHeight +
                      getVerticalFadingEdgeLength() * 2;
          }

          // 如果为 AT_MOST ，则会调用 measureHeightOfChildren() 方法，重新计算 View 高度
          if (heightMode == MeasureSpec.AT_MOST) {
              heightSize = measureHeightOfChildren(widthMeasureSpec, 0, NO_POSITION, heightSize, -1);
          }

          setMeasuredDimension(widthSize, heightSize);
      }

  ```

  而至于 Integer.MAX_VALUE >> 2，则是因为 SpecSize 是一个 30 位的值，使用 Integer.MAX_VALUE 是希望这个值尽可能的大，在后续为各个条目指定测量模式时，因为传下来的是 AT_MOST, 因此 resultSize 即为传下来的 Integer.MAX_VALUE >> 2，保证每个条目的高度自适应。

  ```java
  public static int getChildMeasureSpec(int spec, int padding, int childDimension) {
          int specMode = MeasureSpec.getMode(spec);
          int specSize = MeasureSpec.getSize(spec);

          int size = Math.max(0, specSize - padding);

          int resultSize = 0;
          int resultMode = 0;

          switch (specMode) { 
                  // Parent has imposed a maximum size on us
              case MeasureSpec.AT_MOST:
                  if (childDimension >= 0) {
                      // Child wants a specific size... so be it
                      resultSize = childDimension;
                      resultMode = MeasureSpec.EXACTLY;
                  } else if (childDimension == LayoutParams.MATCH_PARENT) {
                      // Child wants to be our size, but our size is not fixed.
                      // Constrain child to not be bigger than us.
                      resultSize = size;
                      resultMode = MeasureSpec.AT_MOST;
                  } else if (childDimension == LayoutParams.WRAP_CONTENT) {
                      // Child wants to determine its own size. It can't be
                      // bigger than us.
                      resultSize = size;
                      resultMode = MeasureSpec.AT_MOST;
                  }
                  break;
          }
              
          //noinspection ResourceType
          return MeasureSpec.makeMeasureSpec(resultSize, resultMode);
  }
  ```

  ​

