# sprite
A sprite library, complete with frame-rate throttling, that can be used to replace animated GIFs with PNG sprite sheets.

## Requirements

-  Sprite sheets can have any number of items per row, but 1 row = 1 second
-  By default we assume a row has 30 frames of animation, so if not, make sure to pass in fps as an option, `new Sprite(htmlImg, {fps: 10});`

## Options

```javascript

options = {
  noInterpolate: Boolean, // default = false
  loop: Boolean,          // default = true
  fps: Number             // default = 30, how many frames are contained horizontally in the sprite, 
                          // assuming 100% width = 1 second (1 row = 1 second)
}

//Create the sprite
var mySprite = new Sprite(htmlElement, options);
```

## Use

This library hooks into any HTML Element, and will replace the src of an img with a blank image,
while using the *background-image* in CSS to place and render the sprite. Therefore, you can use 
standard `<img src="someSprite.png" />` and then pass that image into the library to take it from
there.




```javascript
<script src="https://cdn.rawgit.com/active-video/sprite/master/Sprite.js"></script>

<script>

options = {
  noInterpolate: Boolean, // default = false
  loop: Boolean,          // default = true
  fps: Number             // default = 30, how many frames are contained horizontally in the sprite, 
                          // assuming 100% width = 1 second (1 row = 1 second)
}

//Create the sprite
var mySprite = new Sprite(htmlElement, options);

//Add it to the sprite manager to be entered into the animation loop
var manager = SpirteManager.getInstance(); //note, SpriteManager.getInstance() is the only way to access it
manager.add( mySprite );
    
</script>

```

## About

This library was created after much profiling revealed that not only do GIFs look worse (don't need to profile to
know that!) but they scale horribly when many are on a web page. In CloudTV, this means that each GIF is on a different
timeline, and when running at 30fps vs 25fps, performance will vary because each loop through the animated GIF 
will hit different frames. For example, a 7 fps GIF played at 30fps will not repeat the same pattern until the least
common multiple of 7 and 30 is reached, so LCM(7, 30) = 210, which is once every 7 seconds. Further, mixing frame rates
between multiple GIF icons means the non-deterministic nature of these animations is highly-uncacheable. 

Enter Sprite.js. We find that moving all GIF based animations into PNG based sprites offers:

1.  200-300%+ performance increase even while achieving higher frame rates
2.  Higher fps visible in animations
3.  Lower CPU utlization in Chrome, Firefox, CloudTV - all rendering engines tested to date
4.  Better transparency. Since PNG use alpha transparency, and have higher bit depth, the quality of the images is immensely better.