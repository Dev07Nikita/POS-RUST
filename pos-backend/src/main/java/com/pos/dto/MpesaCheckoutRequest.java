package com.pos.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MpesaCheckoutRequest {
    @NotBlank(message = "Customer phone is required")
    private String customerPhone;

    @NotEmpty(message = "Cart must not be empty")
    @Valid
    private List<CartItemDto> items;
}
