---
thumbnail: https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190415172255.jpg
title: 一个自定义 View 的小效果
tags: [Android]
date: 2019-04-15
---



最近简单学了一个自定义 View 的小效果，本身代码并不算多，但是还是有些新东西，本着好记性不如烂笔头的想法，还是要记录下来备忘，说不上什么时候就会用到。



<!-- more -->



### 效果展示

整体效果大概如图示：

![](https://raw.githubusercontent.com/Joeljt/BlogImage/master/20190414212815.gif)

### 知识点概况

涉及到的知识点其实就那么几个，主要还是思路和编码风格问题；相同的效果用布局摆放，再加上监听 ViewPager 滚动完全可以实现，不过就是扩展性太差，健壮性不太好，也不满足封装的要求，本次实现基本完全使用自定义 View 实现，也是个不错的思路。

需要注意的知识点如下：

1. 最初设计的时候就要考虑到封装，代码耦合性是不是足够低，扩展性是不是足够强；
2. 自定义 View 的生命周期，因为你需要确定 onMeasure 方法何时执行完毕，从而在合适的位置进行参数的初始化工作，保证测量完成，所以需要的空间都可以取到宽高信息；
3. 属性动画的基本使用；
4. Canvas#drawColor 设置背景色
5. Canvas#drawCircle 要注意圆心的位置是在屏幕的左上顶点，屏幕中心的位置需要自己确定；
6. 绘制圆环需要正确确定圆环的半径，同时要考虑到与屏幕相切的位置问题；
7. 如何拦截 View 的创建，并从中去解析自定义属性

下面把整个自定义 View 拆解成几个部分来记录，大概也就是上面的知识点，也没什么好说的，都是熟能生巧的东西，practice makes perfect，没毛病。



### 旋转效果

先来分析一下这个效果

1. 六个小圆均匀分布在大圆上，每个扇形的角度相同，也就是 60°；
2. 整体围成一个大圆，不断旋转，大圆位于屏幕正中，直径为屏幕宽度的 1/2；
3. 六个圆不停的变换位置，但总体位置未发生变化，从而展现出围着大圆旋转的效果；

分析完毕后，我们首先要对诸如画笔颜色，屏幕宽高信息等进行初始化，这个工作只需要执行一次，我们选择在 onLayout 方法中完成，因为需要获取 View 测量后的宽高信息。

```java
private void initParams(Context context) {

    // 获取颜色列表
    mColorArray = context.getResources().getIntArray(R.array.splash_circle_colors);

    // 获取大圆、小圆的半径
    mBigCircleRadius = getMeasuredWidth() / 4;
    mSmallCircleRadius = mBigCircleRadius / 7;

    // 初始化画笔
    mPaint = new Paint();
    mPaint.setDither(true);
    mPaint.setAntiAlias(true);

    // 获取屏幕中心位置的坐标
    mCenterX = getMeasuredWidth() / 2;
    mCenterY = getMeasuredHeight() / 2;

}
```

初始化工作完成后，半径有了，画笔也有了，现在需要确定的是每个小圆圆心的位置：

```java
public void drawCircle(float cx, float cy, float radius, @NonNull Paint paint)
```

大家都学过三角函数，很明显小圆的圆心在大圆圆周上，那么大圆的半径是已知的，每个扇形的角度也是已知的，根据三角函数很容易就能求出来每个小圆圆心向直径做垂线所得到的距离，这个距离又是相对于大圆圆心的距离，大圆圆心坐标已知，很显然就能求得每个小圆的坐标信息。

现在的问题是，怎么让这个小圆转起来？

这里我们的解决办法是，利用一个属性动画，从 0 变化到 2π，也就是整个圆周，在这个过程中，不断地去重绘 View，然后在 onDraw 中更新每个小圆当前的位置，通过重绘来实现不断滚动效果。

废话就不多说了，直接上代码了。

```java
private void setRotateAnimation() {
    mValueAnimator = ObjectAnimator.ofFloat(0, (float) Math.PI * 2);
    mValueAnimator.setRepeatCount(-1);
    mValueAnimator.setDuration(ROTATION_ANIMATION_TIME);
    mValueAnimator.setInterpolator(new LinearInterpolator());
    mValueAnimator.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
        @Override
        public void onAnimationUpdate(ValueAnimator animation) {
            mRotatedAngle = (float) animation.getAnimatedValue();
            invalidate();
        }
    });
    mValueAnimator.start();
}

public void draw(Canvas canvas) {
    // 先绘制整个背景为白色
    canvas.drawColor(Color.WHITE);

    // 得到每个扇形的弧度
    double percentAngle = Math.PI * 2 / mColorArray.length;

    for (int i = 0; i < mColorArray.length; i++) {

        mPaint.setColor(mColorArray[i]);

        double currAngle = percentAngle * i + mRotatedAngle;

        // x轴直角边 = 半径 * cos(角度)
        float cx = mCenterX + (float) (mBigCircleRadius * Math.cos(currAngle));

        // y轴直角边 = 半径 * sin(角度)
        float cy = mCenterY + (float) (mBigCircleRadius * Math.sin(currAngle));

        canvas.drawCircle(cx, cy, mSmallCircleRadius, mPaint);

    }
}
```

整个旋转效果基本上就是这些内容，主要还是一个思路的问题，高中数学的内容，算数过关，代码问题不大。

### 缩放效果

这个效果就更简单了，只是一个很简单的平移动画，怕的是把问题想复杂，比如纠结做出的先放大再缩小是怎么实现的，实际上**那只是属性动画的一个差值器**而已。

本质上这就是每个小圆都从圆周上平移到了圆心处，就是这么简单。只不过在它不是简单的缩放，而是不断的在更改大圆的半径，让整个大圆在慢慢变小。

```java
private void setMergeAnimation() {
    // 从大圆半径长变化到 0，记录变化的值，并将其作为各个小圆绘制位置的参考值
    mValueAnimator = ObjectAnimator.ofFloat(mBigCircleRadius, 0);
    mValueAnimator.setDuration(ROTATION_ANIMATION_TIME / 2);
    mValueAnimator.setInterpolator(new AnticipateInterpolator(5f));
    mValueAnimator.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
        @Override
        public void onAnimationUpdate(ValueAnimator animation) {
            mCurrBigCircleRadius = (float) animation.getAnimatedValue();
            invalidate();
        }
    });
    mValueAnimator.start();
}

public void draw(Canvas canvas) {
    canvas.drawColor(Color.WHITE);
    double percentAngle = Math.PI * 2 / mColorArray.length;
    for (int i = 0; i < mColorArray.length; i++) {
        mPaint.setColor(mColorArray[i]);
        double currAngle = percentAngle * i + mRotatedAngle;
        // 使用 mCurrBigCircleRadius 代替固定的 大圆半径，从而实现向中心靠拢的效果
        float cx = mCenterX + (float) (mCurrBigCircleRadius * Math.cos(currAngle));
        float cy = mCenterY + (float) (mCurrBigCircleRadius * Math.sin(currAngle));
      
        canvas.drawCircle(cx, cy, mSmallCircleRadius, mPaint);
    }
}
```

### 水波纹效果

其实水波纹也就是个视觉效果，本质上就是又画了个圆，只不过这个圆有点大，把整个屏幕都包含进去了，也就是说，整个屏幕本质上是这个圆的内切矩形，即屏幕的对角线是这个圆形的直径。

这里需要注意的是，这个画的并不是个普通的圆，而是一个圆环。具体如图。

```java
private void setMergeAnimation() {
  	// mExtendRadius = (int) Math.sqrt(Math.pow(mCenterX, 2) + Math.pow(mCenterX, 2));
    // mExtendRadius 屏幕对角线的一半，即圆的半径
    mValueAnimator = ObjectAnimator.ofFloat(0, mExtendRadius);
    mValueAnimator.setDuration(ROTATION_ANIMATION_TIME / 2);
    mValueAnimator.addUpdateListener(new ValueAnimator.AnimatorUpdateListener() {
        @Override
        public void onAnimationUpdate(ValueAnimator animation) {
            mCurrBigCircleRadius = (float) animation.getAnimatedValue();
            invalidate();
        }
    });
    mValueAnimator.start();
}

public void draw(Canvas canvas) {
		// mCurrBigCircleRadius 不停变大的半径值
  	// mExtendRadius - mCurrBigCircleRadius -> 圆环的宽度
    float strokeWidth = mExtendRadius - mCurrBigCircleRadius;
    mPaint.setStrokeWidth(strokeWidth);
    mPaint.setStyle(Paint.Style.STROKE); // 设置圆环
    mPaint.setColor(Color.WHITE);
		// 圆环真正的半径
    float radius = strokeWidth / 2 + mCurrBigCircleRadius;
    canvas.drawCircle(mCenterX, mCenterY, radius, mPaint);
}

```

### ViewPager 滚动视差效果

动画结束，下面来简单介绍一下视差效果。个别控件可以跟随 ViewPager 滚动而变化，本来也可以直接监听 ViewPager 滚动，去遍历需要移动的控件来实现同样的效果，但是由于复用性、扩展性都比较差，这里使用自定义属性的方式来实现。**这种方式的重点在于拦截系统 View 的创建，然后解析自定义的属性，从而实现想要的效果。**

- 拦截View的创建

需要使用 LayoutInflater 的 setFactory 方法，具体就不多做介绍了，不了解的自己去了解一下： [Android 探究 LayoutInflater setFactory](<https://blog.csdn.net/lmj623565791/article/details/51503977>)

需要

- 解析自定义属性

  我们为系统控件扩展了自定义属性，在 attrs 中声明：

  ```xml
  <resources>
      <!-- X方向上的位移 -->
      <attr name="translationXIn" format="float" />
      <attr name="translationXOut" format="float" />
      <!-- Y方向上的位移 -->
      <attr name="translationYIn" format="float" />
      <attr name="translationYOut" format="float" />
  </resources>
  ```

  然后我们拦截到系统的 View 后，尝试从中去解析这些自定义的 View；解析到对应的自定义属性后，通过给 View 设置 tag 的方式，将用户设置的信息进行保存：

  ```xml
  <resources>
      <item name="parallax_tag" type="id"/>
  </resources>
  ```

  ```java
   private int[] mParallaxAttrs = new int[]{
              R.attr.translationXIn, R.attr.translationXOut,
              R.attr.translationYIn, R.attr.translationYOut
      };
  
  private void analysisAttrs(View view, Context context, AttributeSet attrs) {
      TypedArray array = context.obtainStyledAttributes(attrs, mParallaxAttrs);
  
      // 主动去解析自定义的几个属性，如果能够拿到，就去遍历解析
      if (array != null && array.getIndexCount() != 0) {
  
          ParallaxTag parallaxTag = new ParallaxTag();
          for (int i = 0; i < array.getIndexCount(); i++) {
  
              int arrayIndex = array.getIndex(i);
  
              switch (arrayIndex) {
                  case 0:
                      parallaxTag.setxIn(array.getFloat(arrayIndex, 0f));
                      break;
                  case 1:
                      parallaxTag.setxOut(array.getFloat(arrayIndex, 0f));
                      break;
                  case 2:
                      parallaxTag.setyIn(array.getFloat(arrayIndex, 0f));
                      break;
                  case 3:
                      parallaxTag.setyOut(array.getFloat(arrayIndex, 0f));
                      break;
              }
  
              // 要紧的问题是，解析到了以后怎么存 -> 给 View 设置 tag
              view.setTag(R.id.parallax_tag, parallaxTag);
  
              // 将准备操作的 View 放入集合中
              mParallaxViews.add(view);
          }
  
          array.recycle();
      }
  }
  ```
  

以上动作在 ViewPager 关联的 Fragment 中实现，这样只需要在 ViewPager 的滑动监听中去取到当前 Fragment 的 View 集合，然后分别为左右两侧的 Fragment 设置进入和划出效果即可。

```java
addOnPageChangeListener(new OnPageChangeListener() {
    @Override
    public void onPageScrolled(int position, float positionOffset, int positionOffsetPixels) {

        // 同时设置左右两侧的 fragment，左边退出，右边进入
        ParallaxFragment outFragment = mFragments.get(position);


        List<View> outFragmentParallaxViews = outFragment.getParallaxViews();
        for (View view : outFragmentParallaxViews) {
            ParallaxTag parallaxTag = (ParallaxTag) view.getTag(R.id.parallax_tag);
            view.setTranslationX(( -positionOffsetPixels) * parallaxTag.getxOut());
            view.setTranslationY(( -positionOffsetPixels) * parallaxTag.getyOut());
        }

        try {
            ParallaxFragment inFragment = mFragments.get(position + 1);
            outFragmentParallaxViews = inFragment.getParallaxViews();
            for (View view : outFragmentParallaxViews) {
                ParallaxTag parallaxTag = (ParallaxTag) view.getTag(R.id.parallax_tag);
                view.setTranslationX(
                  (getMeasuredWidth() - positionOffsetPixels) * parallaxTag.getxIn());
                view.setTranslationY(
                  (getMeasuredWidth() - positionOffsetPixels) * parallaxTag.getyIn());
            }
        } catch (Exception e) {}

    }

    @Override
    public void onPageSelected(int position) {

    }

    @Override
    public void onPageScrollStateChanged(int state) {

    }
});
```

好啦，说到这里就差不多结束了，完结撒花~






