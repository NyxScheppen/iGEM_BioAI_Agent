setwd("/mnt/d/desktop/iGEM_BioAI_Agent/backend/data")
# 设置CRAN镜像
options(repos = c(CRAN = "https://cloud.r-project.org"))

# 安装必要的包
packages <- c("pheatmap", "RColorBrewer", "reshape2", "gridExtra")
for (pkg in packages) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    install.packages(pkg, dependencies = TRUE)
  }
}

# 加载包
library(ggplot2)
library(pheatmap)
library(RColorBrewer)
library(reshape2)
library(gridExtra)

cat("所有必要的包已加载成功！\n")

# 现在读取数据并进行分析
expr_data <- readRDS("expression.rds")
cat("数据读取成功！\n")
cat("数据维度：", dim(expr_data), "\n")