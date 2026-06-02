import { useMutation, useQueryClient} from "@tanstack/react-query";
import { login } from "../lib/api";

const useLogin = ({ onRequiresEmailCode } = {}) => {
    const queryClient = useQueryClient();
const {mutate, isPending, error } = useMutation({
  mutationFn: login,
  onSuccess: (data) => {
    if (data?.requiresEmailCode) {
      onRequiresEmailCode?.(data);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["authUser"] });
  },
});

return {error, isPending, loginMutation: mutate};
};

export default useLogin;
