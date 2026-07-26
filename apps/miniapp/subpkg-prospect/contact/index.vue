<template>
  <view class="page">
    <view class="card">
      <text class="card-title">联系我们</text>
      <view class="contact-row">
        <text class="c-label">客服电话</text>
        <text class="c-value">400-123-4567</text>
      </view>
      <view class="contact-row">
        <text class="c-label">工作时间</text>
        <text class="c-value">周一至周五 9:00-18:00</text>
      </view>
      <view class="contact-row">
        <text class="c-label">电子邮箱</text>
        <text class="c-value">contact@hxfood.com</text>
      </view>
    </view>

    <view class="card">
      <text class="card-title">关注公众号</text>
      <image class="qrcode" src="/static/logo.png" mode="aspectFit" />
      <text class="qrcode-tip">微信扫码关注"核销食"公众号</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.card { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 20rpx; text-align: center; }
.card-title { font-size: 30rpx; font-weight: 600; margin-bottom: 20rpx; display: block; }
.contact-row { display: flex; justify-content: space-between; padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.contact-row:last-child { border-bottom: none; }
.c-label { font-size: 26rpx; color: #666; }
.c-value { font-size: 26rpx; color: #333; font-weight: 500; }
.qrcode { width: 300rpx; height: 300rpx; margin: 20rpx auto; background: #f5f5f5; border-radius: 12rpx; }
.qrcode-tip { font-size: 24rpx; color: #999; display: block; }
</style>
