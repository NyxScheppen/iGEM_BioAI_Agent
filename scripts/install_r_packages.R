options(repos = c(CRAN = "https://cloud.r-project.org"))

cat("==> Installing CRAN helper packages...\n")
if (!requireNamespace("BiocManager", quietly = TRUE)) {
  install.packages("BiocManager")
}

cran_packages <- c(
  "data.table",
  "ggplot2",
  "pheatmap",
  "survival",
  "survminer",
  "glmnet",
  "timeROC",
  "pROC",
  "caret",
  "randomForest",
  "e1071",
  "msigdbr",
  "Seurat",
  "SeuratObject",
  "patchwork",
  "dplyr"
)

bioc_packages <- c(
  "limma",
  "DESeq2",
  "clusterProfiler",
  "enrichplot",
  "org.Hs.eg.db",
  "org.Mm.eg.db",
  "GSVA"
)

install_if_missing_cran <- function(pkg) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    cat("Installing CRAN package:", pkg, "\n")
    install.packages(pkg)
  } else {
    cat("Already installed:", pkg, "\n")
  }
}

install_if_missing_bioc <- function(pkg) {
  if (!requireNamespace(pkg, quietly = TRUE)) {
    cat("Installing Bioconductor package:", pkg, "\n")
    BiocManager::install(pkg, ask = FALSE, update = FALSE)
  } else {
    cat("Already installed:", pkg, "\n")
  }
}

cat("==> Installing CRAN packages...\n")
for (pkg in cran_packages) {
  install_if_missing_cran(pkg)
}

cat("==> Installing Bioconductor packages...\n")
for (pkg in bioc_packages) {
  install_if_missing_bioc(pkg)
}

cat("==> All R packages installation finished.\n")