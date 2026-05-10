import axios from "axios";
import { api } from "../../shared/api/api";
import type { IUser } from "../../shared/interfaces/IUser";

export type IPatchMePayload = {
  name?: string;
  email?: string;
  current_password?: string;
  new_password?: string;
};

export async function API_patchMe(payload: IPatchMePayload): Promise<IUser> {
  try {
    const { data } = await api.patch<IUser>("/me", payload);
    return data;
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.data?.detail != null) {
      const d = e.response.data.detail;
      if (typeof d === "string") throw d;
      if (Array.isArray(d)) {
        const msg = d.map((x: { msg?: string }) => x.msg).filter(Boolean).join("; ");
        throw msg || "Error de validación";
      }
      throw JSON.stringify(d);
    }
    throw e;
  }
}
