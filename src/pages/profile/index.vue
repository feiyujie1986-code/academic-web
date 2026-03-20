<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus"
import { ElMessage } from "element-plus"
import { reactive, ref } from "vue"
import { useRouter } from "vue-router"
import { getRolesApi } from "@/api/authority/role"
import { editUserApi, modifyPassApi } from "@/api/authority/user"
import { useValidateEmail, useValidatePhone } from "@/common/utils/useValidate"
import { useUserStore } from "@/pinia/stores/user_n"

const userStore = useUserStore()
const router = useRouter()

function toDefault() {
  router.push("/")
}

// 基本信息表单
const userInfoFormRef = ref<FormInstance>()
const userInfoForm = reactive({
  id: 0,
  createdAt: 0,
  createdDate: "",
  nickname: "",
  email: "",
  gender: 0,
  roleIds: [] as number[]
})

const userInfoRule: FormRules = reactive({
  username: [{ required: true, trigger: "blur", message: "请填写用户名" }],
  phone: [{ validator: useValidatePhone, trigger: "blur" }],
  email: [{ validator: useValidateEmail, trigger: "blur" }]
})

function handleEditUser(formEl: FormInstance | undefined) {
  if (!formEl) return
  formEl.validate((valid) => {
    if (valid) {
      editUserApi({
        id: userInfoForm.id,
        // username: userInfoForm.username,
        // phone: userInfoForm.phone,
        nickname: userInfoForm.nickname,
        email: userInfoForm.email,
        active: true,
        roleIds: userInfoForm.roleIds,
        gender: userInfoForm.gender
      })
        .then((res) => {
          if (res.code === 0) {
            ElMessage({ type: "success", message: res.msg })
          }
          // 刷新userinfo store
          userStore.getInfo()
        })
        .catch(() => {})
    }
  })
}
interface option {
  ID: string
  roleName: string
}
const roleOptions: option[] = []
async function getRoleOption() {
  const res = await getRolesApi()
  if (res.code === 0) {
    res.data.forEach((element) => {
      // 将identity为teacher、student、senior_teacher的role不显示
      if (!["teacher", "student", "senior_teacher", "class_monitor"].includes(element.identity)) {
        roleOptions.push({ ID: String(element.id), roleName: element.roleName })
      }
      getCache()
    })
  }
}
getRoleOption()

// 修改密码表单
const passFormRef = ref<FormInstance>()

const passForm = reactive({
  id: 0,
  oldPassword: "",
  newPassword: "",
  rePassword: ""
})

function equalToPassword(rule: any, value: any, callback: any) {
  if (passForm.newPassword !== value) {
    callback(new Error("两次输入的密码不一致"))
  } else {
    callback()
  }
}

const passFormRules: FormRules = reactive({
  oldPassword: [{ required: true, trigger: "blur", message: "旧密码不能为空" }],
  newPassword: [
    { required: true, trigger: "blur", message: "新密码不能为空" },
    { min: 6, max: 20, message: "长度在 6 到 20 个字符", trigger: "blur" }
  ],
  rePassword: [
    { required: true, trigger: "blur", message: "确认密码不能为空" },
    { required: true, validator: equalToPassword, trigger: "blur" }
  ]
})

function handleModifyPass(formEl: FormInstance | undefined) {
  if (!formEl) return
  formEl.validate((valid) => {
    if (valid) {
      modifyPassApi({
        id: passForm.id,
        oldPassword: passForm.oldPassword,
        newPassword: passForm.newPassword
      })
        .then((res) => {
          if (res.code === 0) {
            ElMessage({ type: "success", message: res.msg })
          }
        })
        .catch(() => {})
    }
  })
}

// 获取缓存数据
function getCache() {
  userInfoForm.id = userStore.userInfo.id
  userInfoForm.createdDate = userStore.userInfo.createdDate
  userInfoForm.createdAt = userStore.userInfo.createdAt
  userInfoForm.email = userStore.userInfo.email
  userInfoForm.nickname = userStore.userInfo.nickname
  userInfoForm.gender = userStore.userInfo.gender
  userInfoForm.roleIds = userStore.userInfo.roles.map(item => item.id)
  passForm.id = userStore.userInfo.id
}
getCache()
</script>

<template>
  <div class="app-container">
    <el-card>
      <el-tabs>
        <el-tab-pane label="基本信息">
          <div class="form-container">
            <el-form label-width="120px" :model="userInfoForm" :rules="userInfoRule" ref="userInfoFormRef">
              <el-form-item label="邮箱" prop="email">
                <el-input style="width: 400px" v-model="userInfoForm.email" disabled />
              </el-form-item>
              <el-form-item label="用户名" prop="nickname" required>
                <el-input style="width: 400px" v-model="userInfoForm.nickname" />
              </el-form-item>
              <el-form-item label="角色">
                <el-select style="width: 400px" v-model="userInfoForm.roleIds" multiple disabled>
                  <el-option v-for="role in roleOptions" :key="role.ID" :label="role.roleName" :value="Number(role.ID)" />
                </el-select>
              </el-form-item>
              <!-- <el-form-item label="手机号码" prop="phone">
                <el-input style="width: 400px" v-model="userInfoForm.phone" />
              </el-form-item> -->
              <el-form-item label="创建日期">
                <el-input style="width: 400px" v-model="userInfoForm.createdDate" disabled />
              </el-form-item>
              <el-form-item style="margin-top: 40px">
                <el-button type="primary" style="margin-right: 20px" @click="handleEditUser(userInfoFormRef)">
                  更新
                </el-button>
                <el-button type="primary" plain @click="toDefault">
                  关闭
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
        <el-tab-pane label="修改密码">
          <div class="form-container">
            <el-form label-width="120px" :model="passForm" ref="passFormRef" :rules="passFormRules">
              <el-form-item label="旧密码" prop="oldPassword" required>
                <el-input
                  style="width: 400px"
                  v-model="passForm.oldPassword"
                  placeholder="请输入旧密码"
                  type="password"
                  show-password
                />
              </el-form-item>
              <el-form-item label="新密码" prop="newPassword" required>
                <el-input
                  style="width: 400px"
                  v-model="passForm.newPassword"
                  placeholder="请输入新密码"
                  type="password"
                  show-password
                />
              </el-form-item>
              <el-form-item label="确认密码" prop="rePassword" required>
                <el-input
                  style="width: 400px"
                  v-model="passForm.rePassword"
                  placeholder="确认密码不能为空"
                  type="password"
                  show-password
                />
              </el-form-item>
              <el-form-item style="margin-top: 40px">
                <el-button type="primary" style="margin-right: 20px" @click="handleModifyPass(passFormRef)">
                  确定
                </el-button>
                <el-button type="primary" plain @click="toDefault">
                  关闭
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style lang="scss" scoped>
.form-container {
  padding: 20px;
}
</style>
