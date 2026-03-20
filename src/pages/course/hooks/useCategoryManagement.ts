import type { FormInstance, FormRules } from "element-plus"
import { reactive, ref } from "vue"
import { addCategoryApi } from "@/api/course/category"

/**
 * 分类管理 Composable
 * 提供添加分类对话框的状态管理和添加分类功能
 */
export function useCategoryManagement(onCategoryAdded?: () => Promise<void>) {
  // 添加分类对话框相关
  const categoryDialogVisible = ref<boolean>(false)
  const categoryFormRef = ref<FormInstance>()
  const categoryFormData = reactive({
    name: ""
  })
  const categoryFormRules: FormRules = reactive({
    name: [{ required: true, trigger: "blur", message: "请输入分类名称" }]
  })

  function openAddCategoryDialog() {
    categoryDialogVisible.value = true
  }

  function closeCategoryDialog() {
    categoryFormRef.value?.resetFields()
    categoryFormData.name = ""
    categoryDialogVisible.value = false
  }

  async function addCategoryAction(formEl: FormInstance | undefined) {
    if (!formEl) return

    return new Promise<void>((resolve, reject) => {
      formEl.validate(async (valid) => {
        if (valid) {
          try {
            const res = await addCategoryApi({
              name: categoryFormData.name
            })
            if (res.code === 0) {
              ElMessage.success("分类添加成功")
              closeCategoryDialog()
              // 更新分类列表（通过回调）
              if (onCategoryAdded) {
                await onCategoryAdded()
              }
              resolve()
            } else {
              reject(new Error("添加分类失败"))
            }
          } catch (error) {
            console.log(error)
            reject(error)
          }
        } else {
          reject(new Error("表单验证失败"))
        }
      })
    })
  }

  return {
    categoryDialogVisible,
    categoryFormRef,
    categoryFormData,
    categoryFormRules,
    openAddCategoryDialog,
    closeCategoryDialog,
    addCategoryAction
  }
}
