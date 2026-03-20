setwd("/mnt/d/desktop/iGEM_BioAI_Agent/backend/data")
# 设置库路径并安装必要的包
.libPaths(c('/home/nyxscheppen/R/x86_64-pc-linux-gnu-library/4.3', .libPaths()))

# 检查并安装tidyverse
if (!require("tidyverse", quietly = TRUE)) {
  cat("正在安装tidyverse包...\n")
  install.packages("tidyverse", dependencies = TRUE, repos = "https://cloud.r-project.org")
  library(tidyverse)
  cat("tidyverse安装完成\n")
} else {
  library(tidyverse)
  cat("tidyverse已加载\n")
}

# 检查并安装其他必要包
required_packages <- c("pheatmap", "ggplot2", "dplyr", "tidyr")
for (pkg in required_packages) {
  if (!require(pkg, quietly = TRUE, character.only = TRUE)) {
    cat("正在安装", pkg, "...\n")
    install.packages(pkg, dependencies = TRUE, repos = "https://cloud.r-project.org")
  }
  library(pkg, character.only = TRUE)
}

# 读取数据
cat("正在读取expr.csv文件...\n")
expr_data <- read.csv("expr.csv", row.names = 1)
cat("数据读取成功！\n")

# 显示数据基本信息
cat("\n=== 数据基本信息 ===\n")
cat("数据维度:", dim(expr_data)[1], "行(基因) ×", dim(expr_data)[2], "列(样本)\n")
cat("基因名称:", rownames(expr_data), "\n")
cat("样本名称:", colnames(expr_data), "\n")

# 数据概览
cat("\n=== 数据概览 ===\n")
print(head(expr_data))

# 基本统计
cat("\n=== 基本统计 ===\n")
gene_stats <- data.frame(
  基因 = rownames(expr_data),
  平均值 = rowMeans(expr_data, na.rm = TRUE),
  标准差 = apply(expr_data, 1, sd, na.rm = TRUE),
  最小值 = apply(expr_data, 1, min, na.rm = TRUE),
  最大值 = apply(expr_data, 1, max, na.rm = TRUE),
  零值比例 = apply(expr_data == 0, 1, mean)
)

print(gene_stats)

# 保存处理后的数据
write.csv(expr_data, "expr_processed.csv")
write.csv(gene_stats, "gene_statistics.csv")

cat("\n数据已保存为 expr_processed.csv 和 gene_statistics.csv\n")