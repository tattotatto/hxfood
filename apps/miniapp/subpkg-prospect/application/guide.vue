<template>
  <view class="page">
    <view class="steps">
      <view class="step" v-for="(s, i) in steps" :key="i">
        <view class="step-num">{{ i + 1 }}</view>
        <view class="step-content">
          <text class="step-title">{{ s.title }}</text>
          <text class="step-desc">{{ s.desc }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">资质要求</text>
      <view class="req-list">
        <text class="req-item">• 具备合法有效的营业执照</text>
        <text class="req-item">• 食品经营许可证</text>
        <text class="req-item">• 门店面积不低于 30㎡</text>
        <text class="req-item">• 具备基本的冷藏/冷冻设备</text>
        <text class="req-item">• 经营者身体健康，持有健康证</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">常见问题</text>
      <view class="faq-item" v-for="(f, i) in faqs" :key="i">
        <text class="faq-q">{{ f.q }}</text>
        <text class="faq-a">{{ f.a }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const steps = [
  { title: '浏览品牌', desc: '查看品牌介绍、加盟条件和费用说明' },
  { title: '提交申请', desc: '填写门店信息、上传资质文件' },
  { title: '总部审核', desc: '品牌方审核资质，1-3个工作日' },
  { title: '缴纳费用', desc: '审核通过后缴纳加盟费' },
  { title: '开通账号', desc: '缴费确认后开通订货账号' },
];
const faqs = [
  { q: '加盟费大概多少？', a: '不同品牌费用不同，请查看品牌详情页的费用说明。' },
  { q: '审核需要多长时间？', a: '一般 1-3 个工作日，节假日顺延。' },
  { q: '开店需要什么设备？', a: '冷藏柜、冷冻柜是基本配置，具体以品牌要求为准。' },
  { q: '可以同时加盟多个品牌吗？', a: '可以，每个品牌申请独立提交审核。' },
];
</script>

<style lang="scss" scoped>
.page { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.steps { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 20rpx; }
.step { display: flex; align-items: flex-start; gap: 20rpx; padding-bottom: 30rpx; border-left: 2rpx dashed #e0e0e0; margin-left: 24rpx; padding-left: 30rpx; position: relative; }
.step:last-child { border-left: none; padding-bottom: 0; }
.step-num { width: 48rpx; height: 48rpx; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; text-align: center; line-height: 48rpx; font-size: 24rpx; font-weight: 600; position: absolute; left: -24rpx; flex-shrink: 0; }
.step-title { font-size: 28rpx; font-weight: 600; display: block; }
.step-desc { font-size: 24rpx; color: #999; display: block; margin-top: 4rpx; }
.section { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-bottom: 20rpx; }
.section-title { font-size: 30rpx; font-weight: 600; margin-bottom: 16rpx; display: block; }
.req-item { font-size: 26rpx; color: #666; line-height: 2; display: block; }
.faq-item { margin-bottom: 20rpx; }
.faq-item:last-child { margin-bottom: 0; }
.faq-q { font-size: 26rpx; font-weight: 500; color: #333; display: block; }
.faq-a { font-size: 24rpx; color: #999; display: block; margin-top: 6rpx; }
</style>
