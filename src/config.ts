export const SITE = {
  website: "https://astrowong.vercel.app/", // 部署后更新为实际域名
  author: "wangcw",
  profile: "https://github.com/redgreat",
  desc: "無糧不聚兵 - 个人技术博客，记录技术探索与生活感悟",
  title: "無糧不聚兵",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 8,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true,
  editPost: {
    enabled: true,
    text: "编辑本文",
    url: "https://github.com/redgreat/astrowong/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr",
  lang: "zh-CN",
  timezone: "Asia/Shanghai",
} as const;
